import { useState, useCallback } from 'react';
import { ArrowUpDown } from 'lucide-react';
import AutoComplete from './AutoComplete';
import { useLignes } from '../../hooks/useLignes';
import Chargement from '../ui/Chargement';

export default function BarreRecherche({ onItineraireCalcule, onChargement }) {
  const [depart, setDepart] = useState(null);
  const [arrivee, setArrivee] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const { chercher } = useLignes();

  const calculer = useCallback(async (dep, arr) => {
    if (!dep || !arr) return;

    setEnCours(true);
    onChargement?.(true);
    try {
      const resultats = await chercher(dep, arr);
      onItineraireCalcule(resultats);
    } finally {
      setEnCours(false);
      onChargement?.(false);
    }
  }, [chercher, onItineraireCalcule, onChargement]);

  const handleDepart = useCallback((lieu) => {
    setDepart(lieu);
    if (lieu && arrivee) calculer(lieu, arrivee);
  }, [arrivee, calculer]);

  const handleArrivee = useCallback((lieu) => {
    setArrivee(lieu);
    if (depart && lieu) calculer(depart, lieu);
  }, [depart, calculer]);

  const inverser = () => {
    const ancienDepart = depart;
    const ancienArrivee = arrivee;
    setDepart(ancienArrivee);
    setArrivee(ancienDepart);
    if (ancienDepart && ancienArrivee) {
      calculer(ancienArrivee, ancienDepart);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <AutoComplete
            placeholder="Départ…"
            type="depart"
            onSelection={handleDepart}
          />
          <AutoComplete
            placeholder="Arrivée…"
            type="arrivee"
            onSelection={handleArrivee}
          />
        </div>
        <button
          onClick={inverser}
          className="w-10 h-10 mt-1 flex items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm active:bg-gray-50 shrink-0"
        >
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {enCours && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <Chargement type="itineraire" />
        </div>
      )}
    </div>
  );
}
