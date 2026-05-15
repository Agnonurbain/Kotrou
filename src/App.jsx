import { Routes, Route } from 'react-router-dom';
import { Bus, AlertTriangle, MapPin, User } from 'lucide-react';

function Accueil() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-20 h-20 bg-kotrou-500 rounded-2xl flex items-center justify-center mb-6">
        <Bus className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Kotrou</h1>
      <p className="text-gray-600 text-lg mb-8">
        Transport communautaire pour Abidjan
      </p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <NavCard icon={<MapPin className="w-6 h-6" />} label="Itinéraires" to="/lignes" />
        <NavCard icon={<AlertTriangle className="w-6 h-6" />} label="Alertes" to="/alertes" />
        <NavCard icon={<Bus className="w-6 h-6" />} label="Carte" to="/carte" />
        <NavCard icon={<User className="w-6 h-6" />} label="Profil" to="/profil" />
      </div>
    </div>
  );
}

function NavCard({ icon, label, to }) {
  return (
    <a
      href={to}
      className="flex flex-col items-center gap-2 p-4 bg-kotrou-50 rounded-xl border border-kotrou-100 hover:bg-kotrou-100 transition-colors"
    >
      <span className="text-kotrou-500">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </a>
  );
}

function Placeholder({ title }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-500 text-lg">{title} — bientôt disponible</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-kotrou-500 text-white px-4 py-3 flex items-center gap-3">
        <Bus className="w-6 h-6" />
        <span className="font-bold text-lg">Kotrou</span>
      </header>
      <main className="p-4">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/lignes" element={<Placeholder title="Itinéraires" />} />
          <Route path="/alertes" element={<Placeholder title="Alertes trafic" />} />
          <Route path="/carte" element={<Placeholder title="Carte" />} />
          <Route path="/profil" element={<Placeholder title="Profil" />} />
        </Routes>
      </main>
    </div>
  );
}
