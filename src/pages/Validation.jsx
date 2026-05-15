import { useState, useEffect, useCallback } from 'react';
import { fr } from '../i18n/fr';
import { supabase } from '../supabase';
import Header from '../components/layout/Header';
import CarteContribution from '../components/contribution/CarteContribution';
import Chargement from '../components/ui/Chargement';
import EtatVide from '../components/ui/EtatVide';
import Toast from '../components/ui/Toast';

const FILTRES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'gbaka', libelle: fr.transport.gbaka },
  { valeur: 'woro', libelle: fr.transport.woro },
  { valeur: 'sotra', libelle: fr.transport.sotra },
];

export default function Validation() {
  const [lignes, setLignes] = useState([]);
  const [etat, setEtat] = useState('loading');
  const [filtre, setFiltre] = useState('');
  const [mesVotes, setMesVotes] = useState({});
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(null);

  const charger = useCallback(async () => {
    setEtat('loading');

    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    let query = supabase
      .from('lignes')
      .select('*')
      .gte('confiance', 0)
      .lte('confiance', 3)
      .order('created_at', { ascending: false });

    if (filtre) query = query.eq('type', filtre);

    const { data, error } = await query;

    if (error) { setEtat('error'); return; }

    if (user) {
      const ligneIds = (data || []).map((l) => l.id);
      if (ligneIds.length > 0) {
        const { data: votes } = await supabase
          .from('votes')
          .select('ligne_id, vote')
          .eq('user_id', user.id)
          .in('ligne_id', ligneIds);

        const votesMap = {};
        (votes || []).forEach((v) => { votesMap[v.ligne_id] = v.vote; });
        setMesVotes(votesMap);

        const nonVotees = (data || []).filter((l) => !votesMap[l.id]);
        setLignes(nonVotees);
        setEtat(nonVotees.length > 0 ? 'success' : 'empty');
        return;
      }
    }

    setLignes(data || []);
    setEtat((data || []).length > 0 ? 'success' : 'empty');
  }, [filtre]);

  useEffect(() => { charger(); }, [charger]);

  const voter = useCallback(async (ligneId, vote) => {
    if (!userId) {
      setToast({ message: 'Connecte-toi pour voter', type: 'info' });
      return;
    }

    setMesVotes((prev) => ({ ...prev, [ligneId]: vote }));
    setLignes((prev) => prev.filter((l) => l.id !== ligneId));

    const { error } = await supabase
      .from('votes')
      .upsert({ ligne_id: ligneId, user_id: userId, vote }, { onConflict: 'ligne_id,user_id' });

    if (error) {
      setMesVotes((prev) => { const n = { ...prev }; delete n[ligneId]; return n; });
      charger();
      setToast({ message: fr.erreurs.serveur, type: 'erreur' });
    } else {
      setToast({ message: vote === 1 ? 'Contribution confirmée' : 'Contribution rejetée', type: 'succes' });
    }
  }, [userId, charger]);

  const nb = lignes.length;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header titre={`Contributions à valider${nb > 0 ? ` (${nb})` : ''}`} retour />

      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto">
        {FILTRES.map((f) => (
          <button
            key={f.valeur}
            onClick={() => setFiltre(f.valeur)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[36px] ${
              filtre === f.valeur ? 'bg-kotrou-orange text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 pt-2">
        {etat === 'loading' && <Chargement type="ligne" nb={3} />}
        {etat === 'empty' && <EtatVide type="contributions" />}
        {etat === 'error' && (
          <div className="text-center py-8">
            <p className="text-gray-500">{fr.erreurs.serveur}</p>
          </div>
        )}
        {etat === 'success' && lignes.map((l) => (
          <CarteContribution
            key={l.id}
            ligne={l}
            monVote={mesVotes[l.id] || null}
            onVote={(v) => voter(l.id, v)}
          />
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
