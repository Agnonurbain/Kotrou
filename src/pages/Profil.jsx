import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Settings, Award, CheckCircle, Lock, Star } from 'lucide-react';
import { fr } from '../i18n/fr';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { BADGES } from '../data/badges';
import Header from '../components/layout/Header';
import Bouton from '../components/ui/Bouton';
import BadgeTransport from '../components/itineraire/BadgeTransport';
import Badge from '../components/ui/Badge';
import Chargement from '../components/ui/Chargement';

function statutLigne(confiance) {
  if (confiance >= 5) return { label: 'Validée', classe: 'text-kotrou-vert bg-kotrou-vert/10' };
  if (confiance >= 0) return { label: 'En attente', classe: 'text-amber-600 bg-amber-50' };
  return { label: 'Rejetée', classe: 'text-kotrou-rouge bg-kotrou-rouge/10' };
}

function dateInscription(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function Profil() {
  const navigate = useNavigate();
  const { utilisateur, profil, seDeconnecter, badgesDebloques, demanderConnexion, enAttente } = useAuth();
  const [mesLignes, setMesLignes] = useState([]);
  const [chargementLignes, setChargementLignes] = useState(false);

  useEffect(() => {
    if (!utilisateur) return;
    setChargementLignes(true);
    supabase
      .from('lignes')
      .select('id, nom_ligne, type, confiance, created_at')
      .eq('contributeur_id', utilisateur.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setMesLignes(data || []);
        setChargementLignes(false);
      });
  }, [utilisateur]);

  if (enAttente) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
        <Header titre={fr.navigation.profil} />
        <div className="p-4"><Chargement type="profil" /></div>
      </div>
    );
  }

  if (!utilisateur) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
        <Header titre={fr.navigation.profil} />
        <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <Award className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-kotrou-gris mb-2">Connecte-toi</h2>
          <p className="text-sm text-gray-400 mb-6">Pour voir ton profil, tes badges et tes contributions.</p>
          <Bouton variante="primaire" onClick={demanderConnexion}>Se connecter</Bouton>
        </div>
      </div>
    );
  }

  const tel = profil?.telephone || '';
  const telMasque = tel ? `${tel.slice(0, 7)}••••${tel.slice(-2)}` : '••••';
  const initiales = tel ? tel.slice(4, 6) : '??';
  const debloques = badgesDebloques();
  const debloquesIds = new Set(debloques.map((b) => b.id));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header
        titre={fr.navigation.profil}
        action={{ icone: <Settings className="w-5 h-5" />, onClick: () => navigate('/parametres') }}
      />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-kotrou-orange rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
            {initiales}
          </div>
          <div>
            <p className="text-sm font-semibold text-kotrou-gris">{telMasque}</p>
            <p className="text-xs text-gray-400">Membre depuis {dateInscription(profil?.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-kotrou-orange">{profil?.contributions || 0}</p>
            <p className="text-xs text-gray-400">Contributions</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-kotrou-orange">{profil?.points || 0}</p>
            <p className="text-xs text-gray-400">Points</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Mes badges</p>
          <div className="flex flex-wrap gap-2">
            {BADGES.filter((b) => !b.commune).map((badge) => {
              const unlocked = debloquesIds.has(badge.id);
              const restant = badge.seuil ? Math.max(0, badge.seuil - (profil?.contributions || 0)) : 0;
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                    unlocked ? 'bg-kotrou-orange/10 text-kotrou-orange' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {unlocked ? <CheckCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {badge.label}
                  {!unlocked && restant > 0 && (
                    <span className="text-[10px]">({restant})</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => navigate('/trajets-favoris')}
          className="w-full bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between active:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-kotrou-orange" />
            <span className="text-sm font-medium text-kotrou-gris">Mes trajets favoris</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">Mes lignes soumises</p>
            {mesLignes.length > 0 && (
              <button
                onClick={() => navigate('/validation')}
                className="text-xs text-kotrou-orange font-medium"
              >
                Voir toutes
              </button>
            )}
          </div>

          {chargementLignes ? (
            <Chargement type="ligne" nb={2} />
          ) : mesLignes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune contribution encore. Commence par ajouter une ligne !
            </p>
          ) : (
            <div className="space-y-2">
              {mesLignes.map((l) => {
                const statut = statutLigne(l.confiance);
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/detail/${l.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg active:bg-gray-50 min-h-[48px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BadgeTransport type={l.type} />
                      <span className="text-sm text-kotrou-gris truncate">{l.nom_ligne}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statut.classe}`}>
                        {statut.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Bouton
          variante="ghost"
          fullWidth
          icone={<LogOut className="w-4 h-4" />}
          onClick={seDeconnecter}
        >
          Se déconnecter
        </Bouton>
      </div>
    </div>
  );
}
