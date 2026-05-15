import { WifiOff } from 'lucide-react';
import { fr } from '../../i18n/fr';
import { useOffline } from '../../hooks/useOffline';

export default function BanniereOffline() {
  const { estHorsLigne } = useOffline();

  if (!estHorsLigne) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2 h-9">
      <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
      <span className="text-xs text-amber-800 truncate">{fr.etats.hors_ligne}</span>
    </div>
  );
}
