import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function Header({ titre, retour, action }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-kotrou-orange text-white h-14 flex items-center px-3 gap-2">
      {retour && (
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex items-center justify-center -ml-1 rounded-full active:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <h1 className="flex-1 text-lg font-bold truncate">{titre}</h1>
      {action && (
        <button
          onClick={action.onClick}
          className="w-11 h-11 flex items-center justify-center -mr-1 rounded-full active:bg-white/20 transition-colors"
        >
          {action.icone}
        </button>
      )}
    </header>
  );
}
