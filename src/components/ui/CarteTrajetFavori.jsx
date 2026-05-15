import { Bell, BellOff, Trash2, MapPin, Clock, Calendar } from 'lucide-react';

const JOURS_LABELS = { lun: 'L', mar: 'M', mer: 'Me', jeu: 'J', ven: 'V', sam: 'S', dim: 'D' };
const TOUS_JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export default function CarteTrajetFavori({ trajet, onToggleAlertes, onSupprimer }) {
  const jours = trajet.jours_actifs || [];
  const joursTexte = jours.length === 7
    ? 'Tous les jours'
    : jours.length === 5 && !jours.includes('sam') && !jours.includes('dim')
      ? 'Lun-Ven'
      : jours.map((j) => JOURS_LABELS[j] || j).join(', ');

  const heureTexte = trajet.heure_depart && trajet.heure_arrivee
    ? `${trajet.heure_depart.slice(0, 5)} → ${trajet.heure_arrivee.slice(0, 5)}`
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-kotrou-gris truncate">{trajet.nom}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{trajet.depart_nom} → {trajet.arrivee_nom}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        {heureTexte && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {heureTexte}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {joursTexte}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <button
          onClick={() => onToggleAlertes(trajet.id, !trajet.alertes_actives)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            trajet.alertes_actives
              ? 'bg-kotrou-orange/10 text-kotrou-orange'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {trajet.alertes_actives ? (
            <><Bell className="w-3.5 h-3.5" /> Alertes ON</>
          ) : (
            <><BellOff className="w-3.5 h-3.5" /> Alertes OFF</>
          )}
        </button>
        <button
          onClick={() => onSupprimer(trajet.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-kotrou-rouge bg-kotrou-rouge/10 active:bg-kotrou-rouge/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
