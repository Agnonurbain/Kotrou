import { Bus, Footprints } from 'lucide-react';
import { fr } from '../../i18n/fr';

const CONFIG = {
  gbaka: { couleur: 'bg-transport-gbaka', label: fr.transport.gbaka },
  woro: { couleur: 'bg-transport-woro', label: fr.transport.woro },
  sotra: { couleur: 'bg-transport-sotra', label: fr.transport.sotra },
  marche: { couleur: 'bg-transport-marche', label: fr.transport.marche },
};

export default function BadgeTransport({ type, nomLigne }) {
  const config = CONFIG[type] || CONFIG.marche;
  const Icone = type === 'marche' ? Footprints : Bus;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-semibold ${config.couleur}`}>
      <Icone className="w-3.5 h-3.5" />
      {nomLigne || config.label}
    </span>
  );
}
