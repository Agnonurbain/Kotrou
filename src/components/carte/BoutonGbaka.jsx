import { Bus, Square } from 'lucide-react';

export default function BoutonGbaka({ actif, nbPoints, distanceKm, wakeLockActif, onDemarrer, onTerminer }) {
  if (actif) {
    return (
      <div className="fixed bottom-[72px] left-3 right-3 z-40 max-w-md mx-auto">
        {!wakeLockActif && (
          <div className="bg-amber-50 text-amber-700 text-xs rounded-t-lg px-3 py-1.5 text-center">
            Garde l'app ouverte pour un meilleur enregistrement
          </div>
        )}
        <button
          onClick={onTerminer}
          className={`w-full flex items-center justify-between px-4 py-3 bg-red-500 text-white font-semibold shadow-lg ${
            wakeLockActif ? 'rounded-xl' : 'rounded-b-xl'
          } animate-pulse`}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white animate-ping" />
            <span className="text-sm">
              En route — {distanceKm.toFixed(1)} km · {nbPoints} pts
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-xs">
            <Square className="w-3 h-3" />
            Terminer
          </div>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onDemarrer}
      className="fixed bottom-[72px] left-3 right-3 z-40 max-w-md mx-auto flex items-center gap-3 px-4 py-3 bg-kotrou-orange text-white rounded-xl shadow-lg active:scale-[0.98] transition-transform"
    >
      <Bus className="w-6 h-6 shrink-0" />
      <div className="text-left">
        <p className="text-sm font-bold">Je suis dans le gbaka</p>
        <p className="text-[11px] opacity-80">Aide a ameliorer les lignes</p>
      </div>
    </button>
  );
}
