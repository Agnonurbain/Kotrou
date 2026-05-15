import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, Check, Loader2, Bell, BellOff, ExternalLink } from 'lucide-react';
import { fr } from '../i18n/fr';
import { COMMUNES } from '../data/communes';
import { useOffline } from '../hooks/useOffline';
import Header from '../components/layout/Header';
import Bouton from '../components/ui/Bouton';
import Toast from '../components/ui/Toast';

export default function Parametres() {
  const { communesTelecharges, telechargerCommune, supprimerCommune, tailleCache } = useOffline();
  const [taille, setTaille] = useState('...');
  const [enCours, setEnCours] = useState({});
  const [toast, setToast] = useState(null);
  const [notifSignalements, setNotifSignalements] = useState(true);
  const [notifLignes, setNotifLignes] = useState(false);

  useEffect(() => {
    tailleCache().then(setTaille);
  }, [tailleCache, communesTelecharges]);

  const telechargeesSet = new Set(communesTelecharges.map((c) => c.communeId));

  const handleTelecharger = useCallback(async (communeId) => {
    setEnCours((prev) => ({ ...prev, [communeId]: 'telecharge' }));
    try {
      const nb = await telechargerCommune(communeId);
      setToast({ message: `${COMMUNES.find((c) => c.id === communeId)?.nom} : ${nb} lignes téléchargées`, type: 'succes' });
    } catch {
      setToast({ message: fr.erreurs.serveur, type: 'erreur' });
    } finally {
      setEnCours((prev) => ({ ...prev, [communeId]: null }));
      tailleCache().then(setTaille);
    }
  }, [telechargerCommune, tailleCache]);

  const handleSupprimer = useCallback(async (communeId) => {
    setEnCours((prev) => ({ ...prev, [communeId]: 'supprime' }));
    try {
      await supprimerCommune(communeId);
      setToast({ message: 'Données supprimées', type: 'info' });
    } catch {
      setToast({ message: fr.erreurs.serveur, type: 'erreur' });
    } finally {
      setEnCours((prev) => ({ ...prev, [communeId]: null }));
      tailleCache().then(setTaille);
    }
  }, [supprimerCommune, tailleCache]);

  const toutSupprimer = useCallback(async () => {
    for (const c of communesTelecharges) {
      await supprimerCommune(c.communeId);
    }
    setToast({ message: 'Toutes les données hors-ligne supprimées', type: 'info' });
    tailleCache().then(setTaille);
  }, [communesTelecharges, supprimerCommune, tailleCache]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header titre="Paramètres" retour />

      <div className="p-4 space-y-6">
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Données hors-ligne</p>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {COMMUNES.map((c) => {
              const downloaded = telechargeesSet.has(c.id);
              const loading = enCours[c.id];
              const meta = communesTelecharges.find((ct) => ct.communeId === c.id);

              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 min-h-[52px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {downloaded ? (
                      <Check className="w-4 h-4 text-kotrou-vert shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm text-kotrou-gris">{c.nom}</span>
                      {meta && (
                        <p className="text-[10px] text-gray-400">{meta.count} lignes</p>
                      )}
                    </div>
                  </div>

                  {loading ? (
                    <Loader2 className="w-5 h-5 text-kotrou-orange animate-spin" />
                  ) : downloaded ? (
                    <button
                      onClick={() => handleSupprimer(c.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg active:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-kotrou-rouge" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTelecharger(c.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg active:bg-kotrou-50"
                    >
                      <Download className="w-4 h-4 text-kotrou-orange" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">Espace utilisé : {taille}</span>
            {communesTelecharges.length > 0 && (
              <button
                onClick={toutSupprimer}
                className="text-xs text-kotrou-rouge font-medium active:underline"
              >
                Tout supprimer
              </button>
            )}
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Notifications</p>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-kotrou-gris">Signalements à proximité</span>
              </div>
              <button
                onClick={() => setNotifSignalements(!notifSignalements)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  notifSignalements ? 'bg-kotrou-orange' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                  notifSignalements ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
              <div className="flex items-center gap-2.5">
                <BellOff className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-kotrou-gris">Nouvelles lignes ajoutées</span>
              </div>
              <button
                onClick={() => setNotifLignes(!notifLignes)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  notifLignes ? 'bg-kotrou-orange' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                  notifLignes ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Informations</p>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3 min-h-[44px]">
              <span className="text-sm text-kotrou-gris">Version</span>
              <span className="text-sm text-gray-400">1.0.0</span>
            </div>
            <button className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] active:bg-gray-50">
              <span className="text-sm text-kotrou-gris">Signaler un bug</span>
              <ExternalLink className="w-4 h-4 text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] active:bg-gray-50">
              <span className="text-sm text-kotrou-gris">Politique de confidentialité</span>
              <ExternalLink className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
