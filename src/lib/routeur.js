import { haversine, tempsMarche } from './distance';
import { HUBS } from '../data/communes';
import { getToutesLignesLocales } from './db-locale';

const RAYON_DEPART = 3000;
const RAYON_HUB = 5000;
const RAYON_ARRIVEE = 3000;
const RAYON_DANGER = 500;
const SEUIL_MARCHE_WORO = 1000;

function milieu(a, b) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

function scorer(prixTotal, dureeTotal, fiabilite) {
  const scorePrix = prixTotal > 0 ? 10000 / prixTotal : 0;
  const scoreDuree = dureeTotal > 0 ? 1000 / dureeTotal : 0;
  return scorePrix * 0.4 + scoreDuree * 0.4 + (fiabilite / 10) * 0.2;
}

function descriptionMarche(dist, destination) {
  if (dist < SEUIL_MARCHE_WORO) return `Marcher jusqu'à ${destination}`;
  const km = (dist / 1000).toFixed(1);
  return `Se rendre à ${destination} (${km} km — wôrô ou taxi)`;
}

function construireDirecte(ligne, depart, arrivee) {
  const distDepart = haversine(depart, coordsDepart(ligne));
  const distArrivee = haversine(arrivee, coordsArrivee(ligne));
  const dureeDepReal = distDepart > SEUIL_MARCHE_WORO ? Math.ceil(distDepart / 300) : tempsMarche(distDepart);
  const dureeArrReal = distArrivee > SEUIL_MARCHE_WORO ? Math.ceil(distArrivee / 300) : tempsMarche(distArrivee);
  const etapes = [
    { type: 'marche', dureeMinutes: dureeDepReal, prix: 0, description: descriptionMarche(distDepart, ligne.depart_gare) },
    { type: ligne.type, dureeMinutes: (ligne.duree ?? 20) + 5, prix: ligne.prix ?? null, ligne, description: `Prendre ${ligne.nom_ligne} depuis ${ligne.depart_gare}` },
    { type: 'marche', dureeMinutes: dureeArrReal, prix: 0, description: descriptionMarche(distArrivee, 'destination') },
  ];
  const prixTotal = etapes.reduce((s, e) => s + (e.prix ?? 0), 0);
  const dureeTotal = etapes.reduce((s, e) => s + e.dureeMinutes, 0);
  return { etapes, prixTotal, dureeTotal, fiabilite: ligne.confiance, score: scorer(prixTotal, dureeTotal, ligne.confiance), direct: true };
}

function construireCorrespondance(l1, l2, hub, depart, arrivee) {
  const distDepart = haversine(depart, coordsDepart(l1));
  const distArrivee = haversine(arrivee, coordsArrivee(l2));
  const dureeDepReal = distDepart > SEUIL_MARCHE_WORO ? Math.ceil(distDepart / 300) : tempsMarche(distDepart);
  const dureeArrReal = distArrivee > SEUIL_MARCHE_WORO ? Math.ceil(distArrivee / 300) : tempsMarche(distArrivee);
  const etapes = [
    { type: 'marche', dureeMinutes: dureeDepReal, prix: 0, description: descriptionMarche(distDepart, l1.depart_gare) },
    { type: l1.type, dureeMinutes: (l1.duree ?? 20) + 5, prix: l1.prix ?? null, ligne: l1, description: `Prendre ${l1.nom_ligne} depuis ${l1.depart_gare}` },
    { type: 'marche', dureeMinutes: 10, prix: 0, description: `Correspondance à ${hub.nom}` },
    { type: l2.type, dureeMinutes: (l2.duree ?? 20) + 5, prix: l2.prix ?? null, ligne: l2, description: `Prendre ${l2.nom_ligne} depuis ${l2.depart_gare}` },
    { type: 'marche', dureeMinutes: dureeArrReal, prix: 0, description: descriptionMarche(distArrivee, 'destination') },
  ];
  const prixTotal = etapes.reduce((s, e) => s + (e.prix ?? 0), 0);
  const dureeTotal = etapes.reduce((s, e) => s + e.dureeMinutes, 0);
  const fiabilite = Math.min(l1.confiance, l2.confiance);
  return { etapes, prixTotal, dureeTotal, fiabilite, score: scorer(prixTotal, dureeTotal, fiabilite), direct: false, hub: hub.nom };
}

function parseWkbHex(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 50) return null;
  const buf = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) buf[i / 2] = parseInt(hex.substr(i, 2), 16);
  const view = new DataView(buf.buffer);
  const le = buf[0] === 1;
  const offset = buf.length >= 25 ? 9 : 5;
  const lng = view.getFloat64(offset, le);
  const lat = view.getFloat64(offset + 8, le);
  return { lat, lng };
}

function parseCoords(val) {
  if (!val) return null;
  if (val.lat != null) return val;
  if (val.coordinates) return { lng: val.coordinates[0], lat: val.coordinates[1] };
  if (typeof val === 'string') return parseWkbHex(val);
  return null;
}

function coordsDepart(l) {
  return parseCoords(l.depart_coords);
}

function coordsArrivee(l) {
  return parseCoords(l.arrivee_coords);
}

async function chercherDirectesEnLigne(depart, arrivee, supabase) {
  const { data, error } = await supabase.rpc('chercher_lignes_directes', {
    lng_dep: depart.lng,
    lat_dep: depart.lat,
    lng_arr: arrivee.lng,
    lat_arr: arrivee.lat,
    rayon_dep: RAYON_DEPART,
    rayon_arr: RAYON_ARRIVEE,
  });

  if (error || !data) {
    const { data: fallback } = await supabase
      .from('lignes_fiables')
      .select('*')
      .gte('confiance', 0);
    return (fallback || []).filter((l) => {
      const cd = coordsDepart(l);
      const ca = coordsArrivee(l);
      if (!cd || !ca) return false;
      return haversine(depart, cd) <= RAYON_DEPART && haversine(arrivee, ca) <= RAYON_ARRIVEE;
    });
  }

  return data;
}

async function chercherSignalements(supabase, lignes, eviterDangers) {
  if (!eviterDangers || !supabase) return new Set();

  const { data } = await supabase
    .from('signalements')
    .select('coords, type')
    .in('type', ['danger', 'fermeture'])
    .gt('expire_at', new Date().toISOString());

  if (!data?.length) return new Set();

  const exclus = new Set();
  for (const ligne of lignes) {
    const cd = coordsDepart(ligne);
    const ca = coordsArrivee(ligne);
    if (!cd || !ca) continue;
    const centre = milieu(cd, ca);
    for (const sig of data) {
      const sc = sig.coords?.coordinates ? { lng: sig.coords.coordinates[0], lat: sig.coords.coordinates[1] } : sig.coords;
      if (sc && haversine(centre, sc) < RAYON_DANGER) {
        exclus.add(ligne.id);
        break;
      }
    }
  }
  return exclus;
}

function chercherDirectesHorsLigne(depart, arrivee, lignes) {
  return lignes.filter((l) => {
    const cd = coordsDepart(l);
    const ca = coordsArrivee(l);
    if (!cd || !ca) return false;
    return l.confiance >= 0 && haversine(depart, cd) <= RAYON_DEPART && haversine(arrivee, ca) <= RAYON_ARRIVEE;
  });
}

function chercherCorrespondances(depart, arrivee, lignes) {
  const resultats = [];
  for (const hub of HUBS) {
    const seg1 = lignes.filter((l) => {
      const cd = coordsDepart(l);
      const ca = coordsArrivee(l);
      if (!cd || !ca) return false;
      return l.confiance >= 0 && haversine(depart, cd) <= RAYON_DEPART && haversine(ca, hub.coords) <= RAYON_HUB;
    });
    const seg2 = lignes.filter((l) => {
      const cd = coordsDepart(l);
      const ca = coordsArrivee(l);
      if (!cd || !ca) return false;
      return l.confiance >= 0 && haversine(cd, hub.coords) <= RAYON_HUB && haversine(arrivee, ca) <= RAYON_ARRIVEE;
    });
    for (const l1 of seg1) {
      for (const l2 of seg2) {
        if (l1.id === l2.id) continue;
        resultats.push(construireCorrespondance(l1, l2, hub, depart, arrivee));
      }
    }
  }
  return resultats;
}

export async function calculerItineraires(depart, arrivee, options = {}, contexte = {}) {
  const { maxResultats = 5, maxCorrespondances = 2, eviterDangers = true } = options;
  const { supabase, modeHorsLigne } = contexte;

  if (haversine(depart, arrivee) < 100) {
    const dist = haversine(depart, arrivee);
    return [{
      etapes: [{ type: 'marche', dureeMinutes: tempsMarche(dist), prix: 0, description: 'Marche directe' }],
      prixTotal: 0,
      dureeTotal: tempsMarche(dist),
      fiabilite: 10,
      score: 100,
      direct: true,
    }];
  }

  let toutesLignes;
  let directes;

  if (modeHorsLigne || !supabase) {
    toutesLignes = await getToutesLignesLocales();
    directes = chercherDirectesHorsLigne(depart, arrivee, toutesLignes);
  } else {
    directes = await chercherDirectesEnLigne(depart, arrivee, supabase);
    const { data: all } = await supabase.from('lignes_fiables').select('*').gte('confiance', 0);
    toutesLignes = all || [];
  }

  const exclus = await chercherSignalements(supabase, [...directes, ...toutesLignes], eviterDangers && !modeHorsLigne);

  const itinerairesDirects = directes
    .filter((l) => l.confiance >= 0 && !exclus.has(l.id))
    .map((l) => construireDirecte(l, depart, arrivee));

  const itinerairesCorrespondance = chercherCorrespondances(depart, arrivee, toutesLignes.filter((l) => !exclus.has(l.id)));

  const tous = [...itinerairesDirects, ...itinerairesCorrespondance.slice(0, maxCorrespondances * 3)];
  tous.sort((a, b) => b.score - a.score);
  return tous.slice(0, maxResultats);
}
