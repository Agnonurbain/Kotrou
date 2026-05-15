import { fr } from '../../i18n/fr';

const COULEURS_TRANSPORT = {
  gbaka: 'bg-transport-gbaka text-white',
  woro: 'bg-transport-woro text-white',
  sotra: 'bg-transport-sotra text-white',
  marche: 'bg-transport-marche text-white',
};

const LABELS_TRANSPORT = {
  gbaka: fr.transport.gbaka,
  woro: fr.transport.woro,
  sotra: fr.transport.sotra,
  marche: fr.transport.marche,
};

const NIVEAUX_CONFIANCE = [
  { min: 4, label: 'Fiable', classe: 'bg-kotrou-vert text-white' },
  { min: 2, label: 'Probable', classe: 'bg-kotrou-jaune text-gray-800' },
  { min: 0, label: 'À vérifier', classe: 'bg-gray-200 text-gray-600' },
];

export default function Badge({ type, valeur }) {
  if (type === 'confiance') {
    const n = parseInt(valeur, 10) || 0;
    const niveau = NIVEAUX_CONFIANCE.find((c) => n >= c.min) || NIVEAUX_CONFIANCE[2];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${niveau.classe}`}>
        {niveau.label}
      </span>
    );
  }

  if (type === 'badge') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-kotrou-100 text-kotrou-700">
        {valeur}
      </span>
    );
  }

  const couleur = COULEURS_TRANSPORT[type] || 'bg-gray-200 text-gray-700';
  const label = LABELS_TRANSPORT[type] || type;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${couleur}`}>
      {valeur || label}
    </span>
  );
}
