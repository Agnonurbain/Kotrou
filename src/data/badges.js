import { COMMUNES } from './communes';

export const BADGES = [
  { id: 'premier_pas', label: 'Premier pas', seuil: 1, desc: 'Ta première contribution' },
  { id: 'contributeur', label: 'Contributeur', seuil: 5, desc: '5 lignes ajoutées' },
  { id: 'expert_quartier', label: 'Expert quartier', seuil: 20, desc: '20 contributions validées' },
  { id: 'validateur', label: 'Validateur', seuil: 10, desc: '10 votes donnés' },
  { id: 'premier_prix', label: 'Informateur', seuil: 1, desc: 'Premier signalement de prix' },
  { id: 'veilleur_prix', label: 'Veilleur des prix', seuil: 10, desc: '10 variations de prix signalées' },
  { id: 'expert_nuit', label: 'Expert nuit', seuil: 5, desc: '5 tarifs de nuit signalés' },
  ...COMMUNES.map((c) => ({
    id: c.id,
    label: c.nom,
    commune: true,
    desc: `Expert de ${c.nom}`,
  })),
];
