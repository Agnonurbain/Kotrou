import { fr } from '../../i18n/fr';
import BadgeTransport from '../itineraire/BadgeTransport';
import Badge from '../ui/Badge';
import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

function tempsEcoule(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export default function CarteContribution({ ligne, onVote, monVote }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {ligne.photo_url && (
        <img src={ligne.photo_url} alt={ligne.nom_ligne} loading="lazy" className="w-full h-32 object-cover" />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeTransport type={ligne.type} nomLigne={ligne.nom_ligne} />
            <Badge type="confiance" valeur={String(ligne.confiance || 0)} />
          </div>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {tempsEcoule(ligne.created_at)}
          </span>
        </div>

        <div className="text-sm text-kotrou-gris">
          <p>
            <span className="text-gray-400">De :</span>{' '}
            {ligne.depart_gare}, {ligne.depart_quartier || ligne.depart_commune}
          </p>
          <p>
            <span className="text-gray-400">Vers :</span>{' '}
            {ligne.arrivee_gare || ligne.arrivee_commune}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {ligne.prix && <span className="font-semibold text-kotrou-orange">{ligne.prix} {fr.itineraire.fcfa}</span>}
          {ligne.duree && <span>{ligne.duree} min</span>}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onVote(1)}
            disabled={monVote === 1}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm min-h-[44px] transition-colors ${
              monVote === 1
                ? 'bg-kotrou-vert text-white'
                : 'bg-kotrou-vert/10 text-kotrou-vert active:bg-kotrou-vert/20'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            Confirmer
          </button>
          <button
            onClick={() => onVote(-1)}
            disabled={monVote === -1}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm min-h-[44px] transition-colors ${
              monVote === -1
                ? 'bg-kotrou-rouge text-white'
                : 'bg-kotrou-rouge/10 text-kotrou-rouge active:bg-kotrou-rouge/20'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}
