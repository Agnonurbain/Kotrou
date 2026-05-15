import { Routes, Route } from 'react-router-dom';
import { fr } from './i18n/fr';
import BottomNav from './components/layout/BottomNav';
import ModalConnexion from './components/auth/ModalConnexion';
import Debug from './pages/Debug';
import Accueil from './pages/Accueil';
import Itineraire from './pages/Itineraire';
import Detail from './pages/Detail';
import Explorateur from './pages/Explorateur';
import Contribution from './pages/Contribution';
import Validation from './pages/Validation';
import Profil from './pages/Profil';
import Parametres from './pages/Parametres';

export default function App() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond">
      <Routes>
        <Route path="/debug" element={<Debug />} />
        <Route path="/itineraire" element={<Itineraire />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/validation" element={<Validation />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="*" element={
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Accueil />} />
                <Route path="/explorer" element={<Explorateur />} />
                <Route path="/contribuer" element={<Contribution />} />
                <Route path="/profil" element={<Profil />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        } />
      </Routes>
      <ModalConnexion />
    </div>
  );
}
