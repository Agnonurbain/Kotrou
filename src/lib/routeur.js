import { haversine, tempsMarche } from './distance';
import { HUBS } from '../data/communes';
import { getToutesLignesLocales } from './db-locale';

const RAYON_DEPART = 800;
const RAYON_HUB = 1500;
const RAYON_ARRIVEE = 800;
const RAYON_DANGER = 300;

function milieu(a, b) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

function scorer(prixTotal, dureeTotal, fiabilite) {
  const scorePrix = prixTotal > 0 ? 10000 / prixTotal : 0;
  const scoreDuree = dureeTotal > 0 ? 1000 / dureeTotal : 0;
  return scorePrix * 0.4 + scoreDuree * 0.4 + (fiabilite / 10) * 0.2;
}

function construireDirecte(ligne, depart, arrivee) {
  const distDepart = haversine(depart, coordsDepart(ligne));
  const distArrivee = haversine(arrivee, coordsArrivee(ligne));
  const etapes = [
    { type: 'marche', dureeMinutes: tempsMarche(distDepart), prix: 0, description: `Marcher jusqu'à ${ligne.depart_gare}` },
    { type: ligne.type, dureeMinutes: (ligne.duree ?? 20) + 5, prix: ligne.prix ?? null, ligne, description: `Prendre ${ligne.nom_ligne} depuis ${ligne.depart_gare}` },
    { type: 'marche', dureeMinutes: tempsMarche(distArrivee), prix: 0, description: "Marcher jusqu'à destination" },
  ];
  const prixTotal = etapes.reduce((s, e) => s + (e.prix ?? 0), 0);
  const dureeTotal = etapes.reduce((s, e) => s + e.dureeMinutes, 0);
  return { etapes, prixTotal, dureeTotal, fiabilite: ligne.confiance, score: scorer(prixTotal, dureeTotal, ligne.confiance), direct: true };
}

function construireCorrespondance(l1, l2, hub, depart, arrivee) {
  const distDepart = haversine(depart, coordsDepart(l1));
  const distArrivee = haversine(arrivee, coordsArrivee(l2));
  const etapes = [
    { type: 'marche', dureeMinutes: tempsMarche(distDepart), prix: 0, description: `Marcher jusqu'à ${l1.depart_gare}` },
    { type: l1.type, dureeMinutes: (l1.duree ?? 20) + 5, prix: l1.prix ?? null, ligne: l1, description: `Prendre ${l1.nom_ligne} depuis ${l1.depart_gare}` },
    { type: 'marche', dureeMinutes: 10, prix: 0, description: `Correspondance à ${hub.nom}` },
    { type: l2.type, dureeMinutes: (l2.duree ?? 20) + 5, prix: l2.prix ?? null, ligne: l2, description: `Prendre ${l2.nom_ligne} depuis ${l2.depart_gare}` },
    { type: 'marche', dureeMinutes: tempsMarche(distArrivee), prix: 0, description: "Marcher jusqu'à destination" },
  ];
  const prixTotal = etapes.reduce((s, e) => s + (e.prix ?? 0), 0);
  const dureeTotal = etapes.reduce((s, e) => s + e.dureeMinutes, 0);
  const fiabilite = Math.min(l1.confiance, l2.confiance);
  return { etapes, prixTotal, dureeTotal, fiabilite, score: scorer(prixTotal, dureeTotal, fiabilite), direct: false, hub: hub.nom };
}

function coordsDepart(l) {
  if (l.depart_coords?.lat != null) return l.depart_coords;
  if (l.depart_coords?.coordinates) return { lng: l.depart_coords.coordinates[0], lat: l.depart_coords.coordinates[1] };
  return null;
}

function coordsArrivee(l) {
  if (l.arrivee_coords?.lat != null) return l.arrivee_coords;
  if (l.arrivee_coords?.coordinates) return { lng: l.arrivee_coords.coordinates[0], lat: l.arrivee_coords.coordinates[1] };
  return null;
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
