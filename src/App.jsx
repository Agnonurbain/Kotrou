import { Routes, Route, Outlet } from 'react-router-dom';
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
import TrajetsFavoris from './pages/TrajetsFavoris';
import Partage from './pages/Partage';
import Parametres from './pages/Parametres';

function LayoutAvecNav() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond">
      <Routes>
        <Route path="/debug" element={<Debug />} />
        <Route path="/itineraire" element={<Itineraire />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/validation" element={<Validation />} />
        <Route path="/trajets-favoris" element={<TrajetsFavoris />} />
        <Route path="/t/:code" element={<Partage />} />
        <Route path="/trajet/:code" element={<Partage />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route element={<LayoutAvecNav />}>
          <Route path="/" element={<Accueil />} />
          <Route path="/explorer" element={<Explorateur />} />
          <Route path="/contribuer" element={<Contribution />} />
          <Route path="/profil" element={<Profil />} />
        </Route>
      </Routes>
      <ModalConnexion />
    </div>
  );
}
