import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { calculerItineraires } from '../lib/routeur';
import { getLignesLocales } from '../lib/db-locale';

export function useLignes() {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const chercher = useCallback(async (depart, arrivee, options = {}) => {
    setChargement(true);
    setErreur(null);
    try {
      const modeHorsLigne = !navigator.onLine;
      const resultats = await calculerItineraires(depart, arrivee, options, {
        supabase: modeHorsLigne ? null : supabase,
        modeHorsLigne,
      });
      return resultats;
    } catch (e) {
      setErreur(e.message);
      return [];
    } finally {
      setChargement(false);
    }
  }, []);

  const parCommune = useCallback(async (communeId) => {
    if (!navigator.onLine) {
      return getLignesLocales(communeId);
    }
    const { data, error } = await supabase
      .from('lignes_fiables')
      .select('*')
      .eq('depart_commune', communeId)
      .order('confiance', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const ajouter = useCallback(async (donnees) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentification requise');

    const { data, error } = await supabase
      .from('lignes')
      .insert({
        ...donnees,
        contributeur_id: user.id,
        depart_coords: donnees.depart_coords ? `POINT(${donnees.depart_coords.lng} ${donnees.depart_coords.lat})` : null,
        arrivee_coords: donnees.arrivee_coords ? `POINT(${donnees.arrivee_coords.lng} ${donnees.arrivee_coords.lat})` : null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const voter = useCallback(async (ligneId, vote) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentification requise');

    const { error } = await supabase
      .from('votes')
      .upsert({ ligne_id: ligneId, user_id: user.id, vote }, { onConflict: 'ligne_id,user_id' });
    if (error) throw error;
  }, []);

  return { chercher, parCommune, ajouter, voter, chargement, erreur };
}
