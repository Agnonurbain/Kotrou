import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { sauvegarderCommune, supprimerCommune as supprimerCommuneDB, getCommunesTelecharges } from '../lib/db-locale';

export function useOffline() {
  const [estHorsLigne, setEstHorsLigne] = useState(!navigator.onLine);
  const [communesTelecharges, setCommunesTelecharges] = useState([]);

  useEffect(() => {
    const onOnline = () => setEstHorsLigne(false);
    const onOffline = () => setEstHorsLigne(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    rafraichirListe();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const rafraichirListe = useCallback(async () => {
    const liste = await getCommunesTelecharges();
    setCommunesTelecharges(liste);
  }, []);

  const telechargerCommune = useCallback(async (communeId) => {
    const { data, error } = await supabase
      .from('lignes_fiables')
      .select('*')
      .eq('depart_commune', communeId);
    if (error) throw error;

    await sauvegarderCommune(communeId, data || []);
    await rafraichirListe();
    return (data || []).length;
  }, [rafraichirListe]);

  const supprimerCommune = useCallback(async (communeId) => {
    await supprimerCommuneDB(communeId);
    await rafraichirListe();
  }, [rafraichirListe]);

  const tailleCache = useCallback(async () => {
    if (!navigator.storage?.estimate) return 'Inconnu';
    const { usage } = await navigator.storage.estimate();
    if (!usage) return '0 Ko';
    if (usage < 1024 * 1024) return `${(usage / 1024).toFixed(1)} Ko`;
    return `${(usage / (1024 * 1024)).toFixed(1)} Mo`;
  }, []);

  return { estHorsLigne, communesTelecharges, telechargerCommune, supprimerCommune, tailleCache };
}
