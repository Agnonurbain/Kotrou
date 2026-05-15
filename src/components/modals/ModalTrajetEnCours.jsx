import { useState, useEffect } from 'react';
import { X, Search, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabase';
import { usePosition } from '../../hooks/usePosition';
import Bouton from '../ui/Bouton';
import BadgeTransport from '../itineraire/BadgeTransport';

export default function ModalTrajetEnCours({ ouvert, onFermer, onDemarrer }) {
  const { coords } = usePosition();
  const [recherche, setRecherche] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [ligneChoisie, setLigneChoisie] = useState(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (!ouvert || !coords) return;
    supabase
      .rpc('lignes_proches', { lng: coords.lng, lat: coords.lat, rayon: 2000, limite: 3 })
      .then(({ data }) => setSuggestions(data || []))
      .catch(() => {
        supabase
          .from('lignes')
          .select('id, nom_ligne, type, depart_gare, arrivee_gare')
          .order('confiance', { ascending: false })
          .limit(3)
          .then(({ data }) => setSuggestions(data || []));
      });
  }, [ouvert, coords?.lat, coords?.lng]);

  useEffect(() => {
    if (recherche.length < 2) { setResultats([]); return; }
    const t = setTimeout(() => {
      supabase
        .from('lignes')
        .select('id, nom_ligne, type, depart_gare, arrivee_gare')
        .ilike('nom_ligne', `%${recherche}%`)
        .order('confiance', { ascending: false })
        .limit(5)
        .then(({ data }) => setResultats(data || []));
    }, 300);
    return () => clearTimeout(t);
  }, [recherche]);

  if (!ouvert) return null;

  const lancer = () => {
    setChargement(true);
    onDemarrer(ligneChoisie);
  };

  const listeAffichee = recherche.length >= 2 ? resultats : suggestions;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-kotrou-gris">Nouveau trajet</p>
          <button onClick={onFermer}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">
            Quelle ligne tu prends ? (optionnel — tu peux le dire après)
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher une ligne..."
              className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm text-kotrou-gris focus:outline-none focus:ring-2 focus:ring-kotrou-orange/30"
            />
          </div>
        </div>

        {listeAffichee.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {listeAffichee.map((l) => (
              <button
                key={l.id}
                onClick={() => setLigneChoisie(ligneChoisie?.id === l.id ? null : l)}
                className={`w-full flex items-center gap-2.5 p-3 rounded-lg text-left transition-colors ${
                  ligneChoisie?.id === l.id
                    ? 'bg-kotrou-orange/10 border border-kotrou-orange'
                    : 'bg-gray-50 active:bg-gray-100'
                }`}
              >
                <BadgeTransport type={l.type} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-kotrou-gris truncate">{l.nom_ligne}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {l.depart_gare} → {l.arrivee_gare || '...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Garde l'écran allumé pour un meilleur enregistrement
        </div>

        <Bouton variante="primaire" fullWidth chargement={chargement} onClick={lancer}>
          Démarrer l'enregistrement
        </Bouton>
      </div>
    </div>
  );
}
