import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const STYLES = {
  succes: { bg: 'bg-kotrou-vert', Icone: CheckCircle },
  erreur: { bg: 'bg-kotrou-rouge', Icone: XCircle },
  info: { bg: 'bg-transport-woro', Icone: Info },
};

export default function Toast({ message, type = 'info', duree = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duree);
    return () => clearTimeout(timer);
  }, [duree, onClose]);

  if (!visible) return null;

  const { bg, Icone } = STYLES[type] || STYLES.info;

  return (
    <div className={`fixed bottom-20 left-4 right-4 max-w-md mx-auto z-[60] ${bg} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg animate-slide-up`}>
      <Icone className="w-5 h-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => { setVisible(false); onClose?.(); }}
        className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full active:bg-white/20"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
