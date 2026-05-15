import { fr } from '../../i18n/fr';
import Bouton from './Bouton';

const CONFIGS = {
  itineraire: {
    message: fr.etats.vide_itineraire,
    svg: (
      <svg viewBox="0 0 120 120" className="w-24 h-24 text-gray-300">
        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 6" />
        <path d="M30 60 Q60 30 90 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <text x="88" y="58" fontSize="24" fill="currentColor" fontWeight="bold">?</text>
      </svg>
    ),
    cta: null,
  },
  lignes: {
    message: fr.etats.vide_lignes,
    svg: (
      <svg viewBox="0 0 120 120" className="w-24 h-24 text-gray-300">
        <rect x="20" y="50" width="80" height="35" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="38" cy="90" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="82" cy="90" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="30" y="58" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="52" y="58" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="74" y="58" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    cta: fr.navigation.contribuer,
  },
  signalements: {
    message: fr.etats.vide_signalements,
    svg: (
      <svg viewBox="0 0 120 120" className="w-24 h-24 text-gray-300">
        <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M60 35 V65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="60" cy="78" r="3" fill="currentColor" />
      </svg>
    ),
    cta: null,
  },
  contributions: {
    message: fr.etats.vide_lignes,
    svg: (
      <svg viewBox="0 0 120 120" className="w-24 h-24 text-gray-300">
        <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M60 40 V80 M40 60 H80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    cta: fr.contribution.titre,
  },
};

export default function EtatVide({ type, onAction }) {
  const config = CONFIGS[type] || CONFIGS.itineraire;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {config.svg}
      <p className="mt-4 text-gray-500 text-sm leading-relaxed">{config.message}</p>
      {config.cta && onAction && (
        <div className="mt-4">
          <Bouton variante="secondaire" taille="sm" onClick={onAction}>
            {config.cta}
          </Bouton>
        </div>
      )}
    </div>
  );
}
