import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Flag, Clock, Coins, Calendar, Camera, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { fr } from '../i18n/fr';
import { supabase } from '../supabase';
import Header from '../components/layout/Header';
import Carte from '../components/carte/Carte';
import BadgeTransport from '../components/itineraire/BadgeTransport';
import Badge from '../components/ui/Badge';
import Bouton from '../components/ui/Bouton';
import Chargement from '../components/ui/Chargement';
import Toast from '../components/ui/Toast';

function parseCoords(c) {
  if (!c) return null;
  if (c.lat != null) return c;
  if (c.coordinates) return { lng: c.coordinates[0], lat: c.coordinates[1] };
  return null;
}

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ligne, setLigne] = useState(null);
  const [arrets, setArrets] = useState([]);
  const [votes, setVotes] = useState({ score: 0, total: 0 });
  const [monVote, setMonVote] = useState(null);
  const [etat, setEtat] = useState('loading');
  const [toast, setToast] = useState(null);
  const [erreurSignal, setErreurSignal] = useState(false);

  useEffect(() => {
    async function charger() {
      setEtat('loading');
      const [ligneRes, arretsRes, votesRes] = await Promise.all([
        supabase.from('lignes').select('*').eq('id', id).single(),
        supabase.from('arrets').select('*').eq('ligne_id', id).order('ordre'),
        supabase.from('votes').select('vote').eq('ligne_id', id),
      ]);

      if (ligneRes.error || !ligneRes.data) { setEtat('error'); return; }

      setLigne(ligneRes.data);
      setArrets(arretsRes.data || []);

      const votesList = votesRes.data || [];
      const score = votesList.reduce((s, v) => s + v.vote, 0);
      setVotes({ score, total: votesList.length });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: mv } = await supabase
          .from('votes')
          .select('vote')
          .eq('ligne_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (mv) setMonVote(mv.vote);
      }

      setEtat('success');
    }
    charger();
  }, [id]);

  const voter = useCallback(async (val) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ message: 'Connecte-toi pour voter', type: 'info' });
      return;
    }

    const ancienVote = monVote;
    setMonVote(val);
    setVotes((prev) => ({
      score: prev.score - (ancienVote || 0) + val,
      total: ancienVote ? prev.total : prev.total + 1,
    }));

    const { error } = await supabase
      .from('votes')
      .upsert({ ligne_id: id, user_id: user.id, vote: val }, { onConflict: 'ligne_id,user_id' });

    if (error) {
      setMonVote(ancienVote);
      setVotes((prev) => ({
        score: prev.score - val + (ancienVote || 0),
        total: ancienVote ? prev.total : prev.total - 1,
      }));
      setToast({ message: fr.erreurs.serveur, type: 'erreur' });
    }
  }, [id, monVote]);

  const signalerErreur = useCallback(async (typeErreur) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ message: 'Connecte-toi pour signaler', type: 'info' });
      return;
    }

    const coords = parseCoords(ligne?.depart_coords);
    if (!coords) return;

    await supabase.from('signalements').insert({
      type: 'fermeture',
      coords: `POINT(${coords.lng} ${coords.lat})`,
      description: `${typeErreur} — Ligne: ${ligne.nom_ligne}`,
      user_id: user.id,
    });

    setErreurSignal(false);
    setToast({ message: fr.signalement.merci, type: 'succes' });
  }, [ligne]);

  if (etat === 'loading') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond">
        <Header titre="Détail de la ligne" retour />
        <div className="p-4"><Chargement type="ligne" nb={4} /></div>
      </div>
    );
  }

  if (etat === 'error' || !ligne) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond">
        <Header titre="Détail de la ligne" retour />
        <div className="p-4 text-center pt-12">
          <p className="text-gray-500 mb-4">{fr.erreurs.serveur}</p>
          <Bouton variante="primaire" onClick={() => navigate(-1)}>Retour</Bouton>
        </div>
      </div>
    );
  }

  const dep = parseCoords(ligne.depart_coords);
  const arr = parseCoords(ligne.arrivee_coords);
  const centre = dep && arr ? { lat: (dep.lat + arr.lat) / 2, lng: (dep.lng + arr.lng) / 2 } : undefined;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header titre="Détail de la ligne" retour />

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <BadgeTransport type={ligne.type} nomLigne={ligne.nom_ligne} />
          <Badge type="confiance" valeur={String(ligne.confiance || 0)} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-kotrou-vert shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-kotrou-gris">{ligne.depart_gare}</p>
              <p className="text-xs text-gray-400">{ligne.depart_quartier ? `${ligne.depart_quartier}, ` : ''}{ligne.depart_commune}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Flag className="w-5 h-5 text-kotrou-rouge shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-kotrou-gris">{ligne.arrivee_gare || ligne.arrivee_commune}</p>
              <p className="text-xs text-gray-400">{ligne.arrivee_quartier ? `${ligne.arrivee_quartier}, ` : ''}{ligne.arrivee_commune}</p>
            </div>
          </div>
        </div>

        {centre && (
          <div className="h-40 rounded-xl overflow-hidden border border-gray-100">
            <Carte
              centre={centre}
              zoom={13}
              marqueurs={[
                { nom: ligne.depart_gare, type: ligne.type, coords: dep, confiance: ligne.confiance },
                ...(arr ? [{ nom: ligne.arrivee_gare || 'Arrivée', type: ligne.type, coords: arr, confiance: ligne.confiance }] : []),
              ]}
            />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <Coins className="w-5 h-5 text-kotrou-orange mx-auto mb-1" />
            <p className="text-sm font-bold text-kotrou-gris">{ligne.prix ? `${ligne.prix} F` : '?'}</p>
            <p className="text-[10px] text-gray-400">Prix</p>
          </div>
          <div>
            <Clock className="w-5 h-5 text-kotrou-orange mx-auto mb-1" />
            <p className="text-sm font-bold text-kotrou-gris">{ligne.duree ? `${ligne.duree} min` : '?'}</p>
            <p className="text-[10px] text-gray-400">Durée</p>
          </div>
          <div>
            <Calendar className="w-5 h-5 text-kotrou-orange mx-auto mb-1" />
            <p className="text-sm font-bold text-kotrou-gris">
              {ligne.horaire_debut?.slice(0, 5) || '05:00'} – {ligne.horaire_fin?.slice(0, 5) || '22:00'}
            </p>
            <p className="text-[10px] text-gray-400">Horaires</p>
          </div>
        </div>

        {ligne.depart_reperes && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Points de repère</p>
            <p className="text-sm text-kotrou-gris">{ligne.depart_reperes}</p>
          </div>
        )}

        {ligne.photo_url ? (
          <img
            src={ligne.photo_url}
            alt={ligne.nom_ligne}
            loading="lazy"
            className="w-full h-48 object-cover rounded-xl border border-gray-100"
          />
        ) : (
          <button
            onClick={() => navigate('/contribuer')}
            className="w-full h-32 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-200"
          >
            <Camera className="w-8 h-8" />
            <span className="text-xs">Ajouter une photo</span>
          </button>
        )}

        {arrets.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Arrêts intermédiaires</p>
            <div className="space-y-2">
              {arrets.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-kotrou-orange shrink-0" />
                  <span className="text-sm text-kotrou-gris">{a.nom}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => voter(1)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[44px] transition-colors ${
                  monVote === 1 ? 'bg-kotrou-vert/10 text-kotrou-vert' : 'text-gray-400 active:bg-gray-50'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
                <span className="text-sm font-semibold">{Math.max(0, votes.score)}</span>
              </button>
              <button
                onClick={() => voter(-1)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[44px] transition-colors ${
                  monVote === -1 ? 'bg-kotrou-rouge/10 text-kotrou-rouge' : 'text-gray-400 active:bg-gray-50'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
              </button>
            </div>
            <span className="text-xs text-gray-400">{votes.total} vote{votes.total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {!erreurSignal ? (
          <Bouton
            variante="ghost"
            fullWidth
            icone={<AlertTriangle className="w-4 h-4" />}
            onClick={() => setErreurSignal(true)}
          >
            Signaler une erreur
          </Bouton>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-sm font-semibold text-kotrou-gris">Type d'erreur</p>
            {['Prix incorrect', 'Ligne supprimée', 'Gare déplacée', 'Autre'].map((t) => (
              <button
                key={t}
                onClick={() => signalerErreur(t)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-kotrou-gris active:bg-gray-50 border border-gray-200 min-h-[44px]"
              >
                {t}
              </button>
            ))}
            <Bouton variante="ghost" fullWidth taille="sm" onClick={() => setErreurSignal(false)}>
              Annuler
            </Bouton>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
