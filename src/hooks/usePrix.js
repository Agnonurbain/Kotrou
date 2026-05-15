import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { detecterContexte } from '../lib/prix';

export function usePrix(ligneId) {
  const [prixActuel, setPrixActuel] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const chargerPrixActuel = useCallback(async () => {
    if (!ligneId) return;
    const contexte = detecterContexte();

    const { data, error } = await supabase
      .rpc('get_prix_actuel', {
        p_ligne_id: ligneId,
        p_contexte: contexte,
        p_fenetre_min: 90,
      })
      .single();

    if (error || !data) return;
    if (data.nb_signalements > 0) {
      setPrixActuel({ ...data, contexte });
    }
  }, [ligneId]);

  useEffect(() => {
    if (!ligneId) return;
    chargerPrixActuel();
    const interval = setInterval(chargerPrixActuel, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [ligneId, chargerPrixActuel]);

  const signalerPrix = useCallback(
    async ({ prixObserve, contexte, note = null }) => {
      if (!prixObserve || prixObserve < 50 || prixObserve > 10000) {
        return { succes: false, raison: 'Prix invalide (entre 50 et 10 000 FCFA)' };
      }

      const maintenant = new Date();

      const { error } = await supabase.from('prix_signalements').insert({
        ligne_id: ligneId,
        prix_observe: Math.round(prixObserve),
        contexte,
        heure_locale: maintenant.getHours(),
        jour_semaine: maintenant.getDay(),
        note: note || null,
      });

      if (error) {
        if (error.code === '23505') {
          return {
            succes: false,
            raison: 'Tu as déjà signalé un prix sur cette ligne cette heure-ci.',
          };
        }
        return { succes: false, raison: error.message };
      }

      await chargerPrixActuel();
      return { succes: true };
    },
    [ligneId, chargerPrixActuel],
  );

  const chargerHistorique = useCallback(
    async (nbJours = 7) => {
      if (!ligneId) return [];
      const { data } = await supabase.rpc('get_historique_prix', {
        p_ligne_id: ligneId,
        p_nb_jours: nbJours,
      });
      return data ?? [];
    },
    [ligneId],
  );

  return {
    prixActuel,
    chargement,
    erreur,
    signalerPrix,
    chargerHistorique,
    recharger: chargerPrixActuel,
  };
}
