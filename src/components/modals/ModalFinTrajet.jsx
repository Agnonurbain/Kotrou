import { useState, useEffect } from 'react';
import { X, Search, MapPin, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../supabase';
import Bouton from '../ui/Bouton';
import BadgeTransport from '../itineraire/BadgeTransport';

export default function ModalFinTrajet({
  ouvert,
  onFermer,
  onEnvoyer,
  onPasser,
  lignePreSelectee,
  nbPoints,
  distanceKm,
  dureeMinutes,
}) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [ligneChoisie, setLigneChoisie] = useState(lignePreSelectee || null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (ouvert) setLigneChoisie(lignePreSelectee || null);
  }, [ouvert, lignePreSelectee]);

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

  const handleEnvoyer = async () => {
    setEnvoi(true);
    await onEnvoyer(ligneChoisie);
    setEnvoi(false);
  };

  const handlePasser = async () => {
    setEnvoi(true);
    await onPasser();
    setEnvoi(false);
  };

  const duree = dureeMinutes != null ? dureeMinutes : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-kotrou-gris">Trajet terminé !</p>
          <button onClick={onFermer}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-kotrou-gris">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-kotrou-orange" />
            {distanceKm.toFixed(1)} km
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-kotrou-orange" />
            {duree} min
          </span>
          <span className="text-xs text-gray-400">{nbPoints} points GPS</span>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">
            Sur quelle ligne tu étais ? (aide à améliorer les données)
          </p>

          {ligneChoisie && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-kotrou-orange/10 border border-kotrou-orange mb-2">
              <BadgeTransport type={ligneChoisie.type} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-kotrou-gris truncate">
                  {ligneChoisie.nom_ligne}
                </p>
              </div>
              <button
                onClick={() => setLigneChoisie(null)}
                className="text-gray-400 active:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {!ligneChoisie && (
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
          )}

          {!ligneChoisie && resultats.length > 0 && (
            <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
              {resultats.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLigneChoisie(l); setRecherche(''); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 text-left active:bg-gray-100"
                >
                  <BadgeTransport type={l.type} />
                  <p className="text-sm text-kotrou-gris truncate">{l.nom_ligne}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Bouton variante="primaire" fullWidth chargement={envoi} onClick={handleEnvoyer}>
            {envoi ? 'Envoi...' : 'Envoyer ma trace'}
          </Bouton>
          <Bouton variante="ghost" fullWidth disabled={envoi} onClick={handlePasser}>
            Passer sans associer
          </Bouton>
        </div>
      </div>
    </div>
  );
}
