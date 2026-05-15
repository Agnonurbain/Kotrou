import { useState, useCallback, useEffect } from 'react';
import { fr } from '../i18n/fr';

export function usePosition() {
  const [coords, setCoords] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [precision, setPrecision] = useState(null);
  const [enAttente, setEnAttente] = useState(true);

  const actualiser = useCallback(() => {
    if (!navigator.geolocation) {
      setErreur(fr.erreurs.geoloc_refusee);
      setEnAttente(false);
      return;
    }

    setEnAttente(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPrecision(pos.coords.accuracy);
        setErreur(null);
        setEnAttente(false);
      },
      () => {
        setErreur(fr.erreurs.geoloc_refusee);
        setEnAttente(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    actualiser();
  }, [actualiser]);

  return { coords, erreur, precision, actualiser, enAttente };
}
