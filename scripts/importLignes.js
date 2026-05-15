#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── CLI Args ──────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, def = null) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}

const csvPath = getArg('--csv');
const envPath = getArg('--env', resolve(ROOT, '.env'));
const dryRun = args.includes('--dry-run');
const fromRow = parseInt(getArg('--from-row', '0'));
const batchSize = parseInt(getArg('--batch-size', '100'));
const verbose = args.includes('--verbose');

if (!csvPath) {
  console.error('Usage: node scripts/importLignes.js --csv <fichier> [--dry-run] [--env .env] [--from-row N] [--batch-size N] [--verbose]');
  process.exit(1);
}

// ── Env ───────────────────────────────────────────────────
config({ path: envPath });
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_KEY (ou VITE_SUPABASE_ANON_KEY) requis dans', envPath);
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_KEY && !dryRun) {
  console.warn('SUPABASE_SERVICE_KEY absent — l\'import reel echouera (RLS). Ajouter service_role key dans .env.\n');
}

// ── Geocode Cache ─────────────────────────────────────────
const CACHE_PATH = resolve(__dirname, 'geocode-cache.json');
let geocodeCache = {};
if (existsSync(CACHE_PATH)) {
  try { geocodeCache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8')); } catch { /* ignore */ }
}
function sauverCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(geocodeCache, null, 2));
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
let dernierAppel = 0;

async function attendreRateLimit() {
  const now = Date.now();
  const attente = 1100 - (now - dernierAppel);
  if (attente > 0) await new Promise(r => setTimeout(r, attente));
  dernierAppel = Date.now();
}

async function geocoderAdresse(query) {
  const cle = query.toLowerCase().trim();
  if (geocodeCache[cle]) return geocodeCache[cle];

  await attendreRateLimit();

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'ci',
    viewbox: '-4.2,5.15,-3.8,5.5',
    bounded: '1',
  });

  for (let tentative = 0; tentative < 2; tentative++) {
    try {
      const res = await fetch(`${NOMINATIM_URL}/search?${params}`, {
        headers: { 'User-Agent': 'Kotrou/1.0 (import-script)' },
      });
      if (!res.ok) {
        if (tentative === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return null;
      }
      const data = await res.json();
      if (!data.length) return null;
      const resultat = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[cle] = resultat;
      sauverCache();
      return resultat;
    } catch {
      if (tentative === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
      return null;
    }
  }
  return null;
}

// ── Centres des communes (fallback niveau 3) ─────────────
const CENTRES_COMMUNES = {
  'Abobo': { lat: 5.4151, lng: -4.0126 },
  'Adjamé': { lat: 5.3600, lng: -4.0167 },
  'Attécoubé': { lat: 5.3400, lng: -4.0600 },
  'Bingerville': { lat: 5.3560, lng: -3.8880 },
  'Cocody': { lat: 5.3470, lng: -3.9860 },
  'Koumassi': { lat: 5.2930, lng: -3.9990 },
  'Marcory': { lat: 5.3020, lng: -4.0100 },
  'Plateau': { lat: 5.3196, lng: -4.0167 },
  'Port-Bouët': { lat: 5.2540, lng: -3.9320 },
  'Songon': { lat: 5.3490, lng: -4.1580 },
  'Treichville': { lat: 5.2937, lng: -4.0100 },
  'Yopougon': { lat: 5.3543, lng: -4.0765 },
};

async function geocoderAvecFallback(gare, quartier, commune) {
  // Niveau 1 : nom exact de la gare
  if (gare) {
    const q1 = [gare, quartier, commune, 'Abidjan, Côte d\'Ivoire'].filter(Boolean).join(', ');
    const coords = await geocoderAdresse(q1);
    if (coords) return { coords, precision: 'exacte' };
  }

  // Niveau 2 : quartier + commune
  if (quartier) {
    const q2 = `${quartier}, ${commune}, Abidjan, Côte d'Ivoire`;
    const coords = await geocoderAdresse(q2);
    if (coords) return { coords, precision: 'quartier' };
  }

  // Niveau 3 : centre de la commune
  const centre = CENTRES_COMMUNES[commune];
  if (centre) return { coords: { ...centre }, precision: 'commune' };

  return { coords: null, precision: null };
}

// ── Encoding fix (Google Sheets double-encoded UTF-8) ─────
function fixerEncodage(texte) {
  if (!texte || typeof texte !== 'string') return texte;
  if (/\xc3[\x80-\xbf]/.test(texte) || /Ã[©¨ª«´²¹§]|Ã´|Ã®|Ã¯|Ã |Ã¹|Ã§|Ã¨|Ãª/.test(texte)) {
    try {
      return Buffer.from(texte, 'latin1').toString('utf-8');
    } catch { /* ignore */ }
  }
  return texte;
}

// ── Normalisation ─────────────────────────────────────────
function normaliserPrix(val) {
  if (!val) return null;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  const n = parseInt(cleaned);
  return isNaN(n) ? null : n;
}

function detecterType(transport) {
  if (!transport) return 'gbaka';
  const low = transport.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/w[oô]r[oô]|woro|taxi/i.test(low)) return 'woro';
  if (/sotra|bus\b|ligne\s*\d/i.test(low)) return 'sotra';
  return 'gbaka';
}

const COMMUNES_MAP = {
  abobo: 'Abobo', adjame: 'Adjamé', attecoube: 'Attécoubé',
  bingerville: 'Bingerville', cocody: 'Cocody', koumassi: 'Koumassi',
  marcory: 'Marcory', plateau: 'Plateau', treichville: 'Treichville',
  yopougon: 'Yopougon', songon: 'Songon',
  'port-bouet': 'Port-Bouët', 'port bouet': 'Port-Bouët', portbouet: 'Port-Bouët',
};

function normaliserCommune(val) {
  if (!val) return null;
  const trimmed = fixerEncodage(val.trim());
  const low = trimmed.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [k, v] of Object.entries(COMMUNES_MAP)) {
    if (low.includes(k)) return v;
  }
  return trimmed;
}

function construireNomLigne(type, transport, gare, quartier, commune, destination) {
  const t = (transport || '').trim();
  const tLow = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const isGeneric = !t || /^(rien|non|aucun|gbaka|woro|sotra|bus)$/i.test(tLow)
    || /^w[oô]r[oô][\s-]*w[oô]r[oô]$/i.test(tLow);

  if (isGeneric) {
    const depart = gare || quartier || commune;
    const typeLabel = type === 'woro' ? 'Wôrô-wôrô' : type === 'sotra' ? 'SOTRA' : 'Gbaka';
    return `${typeLabel} ${depart} - ${destination}`;
  }
  return t;
}

// ── CSV Section detection ─────────────────────────────────
function identifierSections(headers) {
  const sections = [];
  for (let i = 2; i < headers.length; i++) {
    const h = fixerEncodage(headers[i] || '').toLowerCase().trim();
    if (h.startsWith('ton quartier') || h.startsWith('ton quartier')) {
      sections.push({ start: i, hasCommuneCol: false });
    } else if (h.startsWith('quelle est ta commune')) {
      sections.push({ start: i, hasCommuneCol: true });
    }
  }
  return sections;
}

function extraireLigneCSV(row, sections) {
  for (const section of sections) {
    let offset = section.start;

    if (section.hasCommuneCol) {
      offset++;
    }

    const quartier = fixerEncodage((row[offset] || '').trim());
    const gare = fixerEncodage((row[offset + 1] || '').trim());
    const transport = fixerEncodage((row[offset + 2] || '').trim());
    const destination = fixerEncodage((row[offset + 3] || '').trim());
    const prix = (row[offset + 4] || '').trim();
    const reperes = fixerEncodage((row[offset + 5] || '').trim());
    const conseil = fixerEncodage((row[offset + 6] || '').trim());

    if (destination || gare || quartier) {
      return { quartier, gare, transport, destination, prix, reperes, conseil };
    }
  }
  return null;
}

// ── Deduplication ─────────────────────────────────────────
function cleDoublon(depart_commune, nom_ligne, depart_gare, arrivee_commune) {
  const n = s => (s || '').toLowerCase().trim();
  return `${n(depart_commune)}|${n(nom_ligne)}|${n(depart_gare)}|${n(arrivee_commune)}`;
}

function extrairePremiereCommune(texte) {
  if (!texte) return texte;
  const parts = texte.split(/[,;\/]/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return normaliserCommune(parts[0]) || parts[0];
  }
  return normaliserCommune(texte) || texte;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const debut = Date.now();

  console.log(`\n  KOTROU — Import CSV -> Supabase`);
  console.log(`  Fichier : ${csvPath}`);
  console.log(`  Mode    : ${dryRun ? 'DRY-RUN (aucune ecriture)' : 'IMPORT REEL'}`);
  console.log('');

  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  if (records.length < 2) {
    console.error('CSV vide ou sans donnees');
    process.exit(1);
  }

  const headers = records[0];
  const sections = identifierSections(headers);
  console.log(`  Sections detectees : ${sections.length}`);

  const dataRows = records.slice(1);
  console.log(`  Lignes CSV : ${dataRows.length}`);
  console.log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let importees = 0;
  let doublonsIgnores = 0;
  let sansCoords = 0;
  let erreursGeocodage = 0;
  const communesCouvertes = new Set();
  const repartitionTypes = { gbaka: 0, woro: 0, sotra: 0 };
  const repartitionPrecision = { exacte: 0, quartier: 0, commune: 0 };
  const doublonsVus = new Set();
  const documentsAInserer = [];
  const erreurs = [];

  for (let i = 0; i < dataRows.length; i++) {
    if (i < fromRow) continue;

    const row = dataRows[i];
    const commune = normaliserCommune(row[1]);

    if (!commune) {
      if (verbose) console.log(`  [${i + 2}] SKIP Commune vide`);
      continue;
    }

    const fields = extraireLigneCSV(row, sections);
    if (!fields) {
      if (verbose) console.log(`  [${i + 2}] SKIP Aucune donnee`);
      continue;
    }

    const prix = normaliserPrix(fields.prix);
    if (prix !== null && prix < 50) {
      if (verbose) console.log(`  [${i + 2}] SKIP Prix < 50 FCFA`);
      continue;
    }

    const type = detecterType(fields.transport);
    const arriveeCommune = extrairePremiereCommune(fields.destination);
    const nomLigne = construireNomLigne(type, fields.transport, fields.gare, fields.quartier, commune, arriveeCommune);

    const cle = cleDoublon(commune, nomLigne, fields.gare, arriveeCommune);
    if (doublonsVus.has(cle)) {
      doublonsIgnores++;
      if (verbose) console.log(`  [${i + 2}] DOUBLON ${commune} -> ${arriveeCommune} (${nomLigne})`);
      continue;
    }
    doublonsVus.add(cle);

    // Geocodage départ — fallback 3 niveaux
    let departResult;
    try {
      departResult = await geocoderAvecFallback(fields.gare, fields.quartier, commune);
    } catch {
      departResult = { coords: null, precision: null };
    }
    if (!departResult.coords || departResult.precision !== 'exacte') erreursGeocodage++;

    // Geocodage arrivée — fallback 3 niveaux
    let arriveeResult;
    try {
      arriveeResult = await geocoderAvecFallback(null, null, arriveeCommune);
    } catch {
      arriveeResult = { coords: null, precision: null };
    }
    if (!arriveeResult.coords) erreursGeocodage++;

    if (!departResult.coords && !arriveeResult.coords) {
      sansCoords++;
      if (verbose) console.log(`  [${i + 2}] SANS COORDS ${commune}/${fields.quartier}/${fields.gare}`);
      continue;
    }

    const doc = {
      nom_ligne: nomLigne,
      type,
      depart_commune: commune,
      depart_quartier: fields.quartier || null,
      depart_gare: fields.gare || nomLigne,
      depart_reperes: fields.reperes || null,
      depart_coords: departResult.coords ? `POINT(${departResult.coords.lng} ${departResult.coords.lat})` : null,
      arrivee_commune: arriveeCommune,
      arrivee_coords: arriveeResult.coords ? `POINT(${arriveeResult.coords.lng} ${arriveeResult.coords.lat})` : null,
      prix,
      confiance: 1,
      source: 'formulaire-kotrou-v1',
      contributeur_id: null,
      coords_precision: departResult.precision || 'commune',
    };

    documentsAInserer.push(doc);
    communesCouvertes.add(commune);
    repartitionTypes[type]++;
    repartitionPrecision[doc.coords_precision]++;

    if (verbose) {
      const precTag = departResult.precision === 'exacte' ? 'GPS' : departResult.precision === 'quartier' ? 'QRT' : 'COM';
      console.log(`  [${i + 2}] OK ${type.toUpperCase().padEnd(5)} ${commune} -> ${arriveeCommune} | ${prix ?? '?'} FCFA | ${nomLigne} [${precTag}]`);
    }
  }

  console.log(`\n  Resume pre-insertion :`);
  console.log(`  A inserer        : ${documentsAInserer.length}`);
  console.log(`  Doublons ignores : ${doublonsIgnores}`);
  console.log(`  Sans coordonnees : ${sansCoords}`);
  console.log(`  Erreurs geocode  : ${erreursGeocodage}`);
  console.log(`  Precision coords : ${repartitionPrecision.exacte} exacte, ${repartitionPrecision.quartier} quartier, ${repartitionPrecision.commune} commune`);
  console.log('');

  if (!dryRun && documentsAInserer.length > 0) {
    console.log('  Insertion dans Supabase...');
    for (let i = 0; i < documentsAInserer.length; i += batchSize) {
      const batch = documentsAInserer.slice(i, i + batchSize);
      const { data, error } = await supabase.from('lignes').insert(batch).select('id');
      if (error) {
        console.error(`  Batch ${Math.floor(i / batchSize) + 1} ERREUR: ${error.message}`);
        erreurs.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
      } else {
        importees += data.length;
        console.log(`  Batch ${Math.floor(i / batchSize) + 1} : ${data.length} lignes inserees`);
      }
    }
  } else if (dryRun) {
    importees = documentsAInserer.length;
    console.log('  DRY-RUN : aucune ecriture effectuee');
    console.log('\n  Apercu des documents :');
    documentsAInserer.forEach((d, i) => {
      const precLabel = d.coords_precision === 'exacte' ? 'GPS' : d.coords_precision === 'quartier' ? 'QUARTIER' : 'COMMUNE';
      console.log(`  ${i + 1}. [${d.type}] ${d.depart_commune} -> ${d.arrivee_commune} | ${d.prix ?? '?'} FCFA | ${d.nom_ligne}`);
      console.log(`     Depart: ${d.depart_gare} ${d.depart_quartier ? '(' + d.depart_quartier + ')' : ''} ${d.depart_coords || '(pas de coords)'} [${precLabel}]`);
    });
  }

  const duree = ((Date.now() - debut) / 60000).toFixed(1);
  const rapport = {
    date: new Date().toISOString(),
    source: csvPath,
    total_lignes_csv: dataRows.length,
    importees,
    doublons_ignores: doublonsIgnores,
    sans_coords_ignorees: sansCoords,
    erreurs_geocodage: erreursGeocodage,
    communes_couvertes: [...communesCouvertes].sort(),
    repartition_types: repartitionTypes,
    repartition_precision: repartitionPrecision,
    duree_import_minutes: parseFloat(duree),
    mode_dry_run: dryRun,
  };

  if (erreurs.length > 0) rapport.erreurs = erreurs;

  const ts = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const reportName = resolve(ROOT, `import-report-${ts}.json`);
  writeFileSync(reportName, JSON.stringify(rapport, null, 2));

  console.log(`\n  Rapport : ${reportName}`);
  console.log(JSON.stringify(rapport, null, 2));
  console.log(`\n  Duree : ${duree} minutes`);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
