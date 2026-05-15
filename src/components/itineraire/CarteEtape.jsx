import { Bus, Footprints, Clock, Coins } from 'lucide-react';
import { fr } from '../../i18n/fr';
import BadgeTransport from './BadgeTransport';
import BadgePrixActuel from '../prix/BadgePrixActuel';
import { usePrix } from '../../hooks/usePrix';

const COULEURS_LIGNE = {
  gbaka: 'bg-transport-gbaka',
  woro: 'bg-transport-woro',
  sotra: 'bg-transport-sotra',
  marche: 'bg-transport-marche',
};

export default function CarteEtape({ etape, index, estDerniere }) {
  const couleur = COULEURS_LIGNE[etape.type] || COULEURS_LIGNE.marche;
  const Icone = etape.type === 'marche' ? Footprints : Bus;
  const { prixActuel } = usePrix(etape.type !== 'marche' ? etape.ligne?.id : null);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${couleur}`}>
          <Icone className="w-4 h-4" />
        </div>
        {!estDerniere && (
          <div className={`w-0.5 flex-1 min-h-[24px] mt-1 ${couleur} opacity-30`} />
        )}
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {etape.ligne && (
              <BadgeTransport type={etape.type} nomLigne={etape.ligne.nom_ligne} />
            )}
            <p className="text-sm text-kotrou-gris">{etape.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {etape.dureeMinutes} {fr.itineraire.min}
          </span>
          {etape.type !== 'marche' && (
            <BadgePrixActuel prixBase={etape.prix} prixActuel={prixActuel} compact />
          )}
        </div>
      </div>
    </div>
  );
}
