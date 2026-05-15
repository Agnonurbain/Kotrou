import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, PlusCircle, User } from 'lucide-react';
import { fr } from '../../i18n/fr';

const ONGLETS = [
  { chemin: '/', label: fr.navigation.accueil, Icone: Home },
  { chemin: '/explorer', label: fr.navigation.explorer, Icone: Map },
  { chemin: '/contribuer', label: fr.navigation.contribuer, Icone: PlusCircle },
  { chemin: '/profil', label: fr.navigation.profil, Icone: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 h-16 max-w-md mx-auto">
      <div className="flex h-full">
        {ONGLETS.map(({ chemin, label, Icone }) => {
          const actif = location.pathname === chemin;
          return (
            <button
              key={chemin}
              onClick={() => navigate(chemin)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors active:bg-gray-50 ${
                actif ? 'text-kotrou-orange' : 'text-gray-400'
              }`}
            >
              <Icone className="w-6 h-6" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
