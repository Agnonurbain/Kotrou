export function detecterContexte(maintenant = new Date()) {
  const heure = maintenant.getHours();
  const jour = maintenant.getDay();
  const mois = maintenant.getMonth();
  const jourMois = maintenant.getDate();

  if (mois === 11 && jourMois >= 24) return 'fin_annee';
  if (heure >= 21 || heure < 5) return 'nuit';
  if (jour === 0 || jour === 6) return 'weekend';
  if (heure >= 6 && heure < 9) return 'pointe_matin';
  if (heure >= 17 && heure < 20) return 'pointe_soir';

  return 'normal';
}

export function analyserVariation(prixActuel, prixBase) {
  if (!prixBase || prixBase === 0) return { ratio: 1, niveau: 'normal' };

  const ratio = prixActuel / prixBase;
  let niveau = 'normal';
  if (ratio > 1.2 && ratio <= 2.0) niveau = 'hausse';
  if (ratio > 2.0) niveau = 'forte_hausse';

  return { ratio: Math.round(ratio * 10) / 10, niveau };
}

export const COULEURS_VARIATION = {
  normal: { fond: 'bg-emerald-100', texte: 'text-emerald-800', icone: '✓' },
  hausse: { fond: 'bg-amber-100', texte: 'text-amber-800', icone: '↑' },
  forte_hausse: { fond: 'bg-red-100', texte: 'text-red-800', icone: '↑↑' },
};

export const LIBELLES_CONTEXTE = {
  normal: 'En journée',
  pointe_matin: 'Pointe matin',
  pointe_soir: 'Pointe soir',
  nuit: 'Tarif nuit',
  weekend: 'Weekend',
  pluie: 'Pluie',
  ferie: 'Jour férié',
  evenement: 'Événement',
  fin_annee: 'Fin d\'année',
};

export const ICONES_CONTEXTE = {
  normal: '☀️',
  pointe_matin: '🚦',
  pointe_soir: '🚦',
  nuit: '🌙',
  weekend: '📅',
  pluie: '🌧️',
  ferie: '🎌',
  evenement: '🎉',
  fin_annee: '🎆',
};

export const COULEURS_CONTEXTE_GRAPHE = {
  normal: '#16A34A',
  pointe_matin: '#F97316',
  pointe_soir: '#F97316',
  nuit: '#8B5CF6',
  weekend: '#3B82F6',
  pluie: '#0EA5E9',
  evenement: '#EC4899',
  ferie: '#F59E0B',
  fin_annee: '#EF4444',
};

export function formaterPrix(prix) {
  if (!prix && prix !== 0) return 'Prix inconnu';
  return new Intl.NumberFormat('fr-FR').format(prix) + ' F';
}

export function ageCourt(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60;
  if (diff < 2) return "à l'instant";
  if (diff < 60) return `il y a ${Math.round(diff)} min`;
  return `il y a ${Math.round(diff / 60)}h`;
}

export function genererValeursRapides(prixBase) {
  if (!prixBase || prixBase <= 0) {
    return [100, 150, 200, 250, 300, 400, 500];
  }
  const arrondir25 = (v) => Math.round(v / 25) * 25;
  return [
    arrondir25(prixBase * 0.75),
    arrondir25(prixBase),
    arrondir25(prixBase * 1.25),
    arrondir25(prixBase * 1.5),
    arrondir25(prixBase * 2),
  ].filter((v, i, arr) => v >= 50 && v <= 10000 && arr.indexOf(v) === i);
}
