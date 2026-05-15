import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, BellOff, Check } from 'lucide-react';
import Header from '../components/layout/Header';
import Bouton from '../components/ui/Bouton';
import CarteTrajetFavori from '../components/ui/CarteTrajetFavori';
import Chargement from '../components/ui/Chargement';
import EtatVide from '../components/ui/EtatVide';
import Toast from '../components/ui/Toast';
import { useTrajets } from '../hooks/useTrajets';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../hooks/useAuth';

export default function TrajetsFavoris() {
  const navigate = useNavigate();
  const { utilisateur, demanderConnexion } = useAuth();
  const { mesTrajets, toggleAlertes, supprimer } = useTrajets();
  const { estSupporte, sAbonner, estAbonne } = usePushNotifications();

  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [pushActif, setPushActif] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const charger = useCallback(async () => {
    if (!utilisateur) { setChargement(false); return; }
    try {
      const data = await mesTrajets();
      setTrajets(data || []);
    } catch {
      setToast({ message: 'Erreur de chargement', type: 'erreur' });
    } finally {
      setChargement(false);
    }
  }, [utilisateur]);

  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    if (estSupporte()) {
      estAbonne().then(setPushActif);
    }
  }, []);

  const handleActiverPush = async () => {
    setPushLoading(true);
    const ok = await sAbonner();
    setPushActif(ok);
    setPushLoading(false);
    setToast({
      message: ok ? 'Notifications activées !' : 'Permission refusée par le navigateur',
      type: ok ? 'succes' : 'erreur',
    });
  };

  const handleToggleAlertes = async (id, actif) => {
    setTrajets((prev) => prev.map((t) => (t.id === id ? { ...t, alertes_actives: actif } : t)));
    try {
      await toggleAlertes(id, actif);
    } catch {
      setTrajets((prev) => prev.map((t) => (t.id === id ? { ...t, alertes_actives: !actif } : t)));
      setToast({ message: 'Erreur', type: 'erreur' });
    }
  };

  const handleSupprimer = async (id) => {
    const ancien = trajets;
    setTrajets((prev) => prev.filter((t) => t.id !== id));
    try {
      await supprimer(id);
      setToast({ message: 'Trajet supprimé', type: 'info' });
    } catch {
      setTrajets(ancien);
      setToast({ message: 'Erreur', type: 'erreur' });
    }
  };

  if (!utilisateur) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
        <Header titre="Mes trajets favoris" retour />
        <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
          <Bell className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-kotrou-gris mb-2">Connecte-toi</h2>
          <p className="text-sm text-gray-400 mb-6">Pour sauvegarder des trajets et recevoir des alertes.</p>
          <Bouton variante="primaire" onClick={demanderConnexion}>Se connecter</Bouton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header
        titre="Mes trajets favoris"
        retour
        action={{ icone: <Plus className="w-5 h-5" />, onClick: () => navigate('/') }}
      />

      <div className="p-4 space-y-4">
        {estSupporte() && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pushActif ? (
                  <Check className="w-4 h-4 text-kotrou-vert" />
                ) : (
                  <BellOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-kotrou-gris font-medium">
                  {pushActif ? 'Notifications activées' : 'Notifications désactivées'}
                </span>
              </div>
              {!pushActif && (
                <Bouton
                  variante="primaire"
                  taille="petit"
                  chargement={pushLoading}
                  onClick={handleActiverPush}
                >
                  Activer
                </Bouton>
              )}
            </div>
          </div>
        )}

        {chargement ? (
          <Chargement type="ligne" nb={3} />
        ) : trajets.length === 0 ? (
          <EtatVide
            type="itineraire"
            message="Aucun trajet favori. Calcule un itinéraire puis sauvegarde-le !"
            onAction={() => navigate('/')}
            actionLabel="Calculer un itinéraire"
          />
        ) : (
          <div className="space-y-3">
            {trajets.map((t) => (
              <CarteTrajetFavori
                key={t.id}
                trajet={t}
                onToggleAlertes={handleToggleAlertes}
                onSupprimer={handleSupprimer}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
