import { Loader2 } from 'lucide-react';

const VARIANTES = {
  primaire: 'bg-kotrou-orange text-white active:bg-kotrou-600',
  secondaire: 'border-2 border-kotrou-orange text-kotrou-orange bg-transparent active:bg-kotrou-50',
  danger: 'bg-kotrou-rouge text-white active:bg-red-700',
  ghost: 'text-kotrou-gris bg-transparent active:bg-gray-100',
};

const TAILLES = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-base rounded-lg gap-2',
  lg: 'h-12 px-6 text-lg rounded-xl gap-2.5',
};

export default function Bouton({
  variante = 'primaire',
  taille = 'md',
  icone,
  chargement,
  disabled,
  fullWidth,
  onClick,
  children,
}) {
  const estDesactive = disabled || chargement;

  return (
    <button
      onClick={onClick}
      disabled={estDesactive}
      className={`
        inline-flex items-center justify-center font-semibold transition-colors
        ${VARIANTES[variante]}
        ${TAILLES[taille]}
        ${fullWidth ? 'w-full' : ''}
        ${estDesactive ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {chargement ? <Loader2 className="w-5 h-5 animate-spin" /> : icone}
      {children}
    </button>
  );
}
