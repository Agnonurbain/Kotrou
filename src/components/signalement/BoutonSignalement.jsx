import { useState, useCallback } from 'react';
import { AlertTriangle, X, ShieldAlert, DoorClosed, TrafficCone, MapPin, WifiOff } from 'lucide-react';
import { fr } from '../../i18n/fr';
import { supabase } from '../../supabase';
import { usePosition } from '../../hooks/usePosition';
import { reverseGeocode } from '../../lib/geocodeur';
import Bouton from '../ui/Bouton';

const TYPES = [
  { id: 'embouteillage', label: fr.signalement.embouteillage, Icone: TrafficCone, couleur: 'text-red-500', duree: 60 },
  { id: 'accident', label: fr.signalement.accident, Icone: AlertTriangle, couleur: 'text-amber-500', duree: 120 },
  { id: 'danger', label: fr.signalement.danger, Icone: ShieldAlert, couleur: 'text-orange-500', duree: 480 },
  { id: 'fermeture', label: fr.signalement.fermeture, Icone: DoorClosed, couleur: 'text-gray-500', duree: 1440 },
];

export default function BoutonSignalement({ onSignaler }) {
  const [ouvert, setOuvert] = useState(false);
  const [typeChoisi, setTypeChoisi] = useState(null);
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [adresse, setAdresse] = useState(null);
  const { coords } = usePosition();
  const horsLigne = !navigator.onLine;

  const ouvrir = useCallback(async () => {
    setOuvert(true);
    setTypeChoisi(null);
    setDescription('');
    setAdresse(null);
    if (coords) {
      const res = await reverseGeocode(coords.lat, coords.lng).catch(() => null);
      if (res) setAdresse(res.nom?.split(',').slice(0, 2).join(','));
    }
  }, [coords]);

  const envoyer = useCallback(async () => {
    if (!typeChoisi || !coords) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      onSignaler?.('auth_required');
      setOuvert(false);
      return;
    }

    setEnvoi(true);
    try {
      const typeConfig = TYPES.find((t) => t.id === typeChoisi);
      const { error } = await supabase.from('signalements').insert({
        type: typeChoisi,
        coords: `POINT(${coords.lng} ${coords.lat})`,
        description: description.trim() || null,
        user_id: user.id,
        duree_validite: typeConfig?.duree || 60,
      });

      if (error) throw error;

      await supabase.from('profils').update({
        points: supabase.rpc ? undefined : undefined,
      }).eq('id', user.id);
      await supabase.rpc('incrementer_points', { uid: user.id, pts: 2 }).catch(() => {});

      setOuvert(false);
      onSignaler?.(typeChoisi);
    } catch {
      onSignaler?.('error');
    } finally {
      setEnvoi(false);
    }
  }, [typeChoisi, coords, description, onSignaler]);

  return (
    <>
      {ouvert && (
        <div className="fixed inset-0 z-[55] bg-black/30" onClick={() => setOuvert(false)} />
      )}

      {ouvert && (
        <div className="fixed bottom-20 left-0 right-0 z-[56] max-w-md mx-auto animate-slide-up">
          <div className="bg-white rounded-t-2xl shadow-xl p-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-kotrou-gris">Signaler un problème</h3>
              <button
                onClick={() => setOuvert(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {coords && adresse && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{adresse}</span>
              </div>
            )}

            {horsLigne && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs rounded-lg px-3 py-2 mb-3">
                <WifiOff className="w-4 h-4 shrink-0" />
                Connexion requise pour signaler
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              {TYPES.map(({ id, label, Icone, couleur }) => (
                <button
                  key={id}
                  onClick={() => setTypeChoisi(id)}
                  disabled={horsLigne}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 min-h-[80px] transition-colors ${
                    typeChoisi === id
                      ? 'border-kotrou-orange bg-kotrou-50'
                      : 'border-gray-200 active:bg-gray-50'
                  } ${horsLigne ? 'opacity-50' : ''}`}
                >
                  <Icone className={`w-7 h-7 ${couleur}`} />
                  <span className="text-xs font-medium text-kotrou-gris text-center">{label}</span>
                </button>
              ))}
            </div>

            {typeChoisi && (
              <div className="space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optionnel) — Ex : Accident au feu de Kouté"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kotrou-orange focus:border-transparent"
                />
                <Bouton
                  fullWidth
                  variante="primaire"
                  onClick={envoyer}
                  chargement={envoi}
                  disabled={!coords || horsLigne}
                >
                  Envoyer le signalement
                </Bouton>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={ouvert ? () => setOuvert(false) : ouvrir}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-kotrou-rouge text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        {ouvert ? <X className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
      </button>
    </>
  );
}
