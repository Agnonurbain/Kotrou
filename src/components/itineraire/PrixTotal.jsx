import { Clock, ArrowLeftRight } from 'lucide-react';
import { fr } from '../../i18n/fr';

export default function PrixTotal({ prix, duree, nbCorrespondances }) {
  return (
    <div className="flex items-center justify-between bg-kotrou-fond rounded-xl p-4 border border-gray-100">
      <div>
        <p className="text-2xl font-bold text-kotrou-gris">
          {prix > 0 ? `${prix} ${fr.itineraire.fcfa}` : fr.itineraire.prix_inconnu}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{fr.itineraire.prix_total}</p>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {duree} {fr.itineraire.min}
        </span>
        {nbCorrespondances > 0 && (
          <span className="flex items-center gap-1">
            <ArrowLeftRight className="w-4 h-4" />
            {nbCorrespondances}
          </span>
        )}
      </div>
    </div>
  );
}
