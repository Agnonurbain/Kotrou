function Bloc({ className }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

function SkeletonItineraire() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Bloc className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Bloc className="h-4 w-3/4" />
            <Bloc className="h-3 w-1/2" />
          </div>
          <Bloc className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCarteEtape() {
  return (
    <div className="p-3 space-y-2">
      <Bloc className="h-20 w-full rounded-lg" />
      <Bloc className="h-4 w-2/3" />
      <Bloc className="h-3 w-1/2" />
    </div>
  );
}

function SkeletonLigne() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Bloc className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bloc className="h-4 w-3/4" />
        <Bloc className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonProfil() {
  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <Bloc className="w-16 h-16 rounded-full" />
      <Bloc className="h-4 w-32" />
      <Bloc className="h-3 w-48" />
      <Bloc className="h-3 w-40" />
    </div>
  );
}

function SkeletonGenerique() {
  return (
    <div className="space-y-3 p-4">
      <Bloc className="h-4 w-full" />
      <Bloc className="h-4 w-5/6" />
      <Bloc className="h-4 w-2/3" />
    </div>
  );
}

const SKELETONS = {
  itineraire: SkeletonItineraire,
  'carte-etape': SkeletonCarteEtape,
  ligne: SkeletonLigne,
  profil: SkeletonProfil,
  generique: SkeletonGenerique,
};

export default function Chargement({ type = 'generique', nb = 1 }) {
  const Composant = SKELETONS[type] || SKELETONS.generique;
  return (
    <div role="status" aria-label="Chargement en cours">
      {Array.from({ length: nb }, (_, i) => (
        <Composant key={i} />
      ))}
    </div>
  );
}
