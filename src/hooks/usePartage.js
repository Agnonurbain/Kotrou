import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  formaterPourWhatsApp,
  formaterPourSMS,
  construireUrlSMS,
  construireUrlWhatsApp,
} from '../lib/partage';

const BASE_URL = import.meta.env.VITE_APP_URL ?? 'https://kotrou.ci';

export function usePartage() {
  const [chargement, setChargement] = useState(false);
  const [lienCourt, setLienCourt] = useState(null);
  const [erreur, setErreur] = useState(null);

  const genererLien = useCallback(
    async (itineraire) => {
      if (lienCourt) return lienCourt;

      setChargement(true);
      setErreur(null);

      try {
        const payload = {
          depart_nom: itineraire.depart_nom || itineraire.depart?.nom || 'Départ',
          arrivee_nom: itineraire.arrivee_nom || itineraire.arrivee?.nom || 'Arrivée',
          prix_total: itineraire.prixTotal,
          duree_total: itineraire.dureeTotal,
          direct: itineraire.direct,
          etapes: itineraire.etapes.map((e) => ({
            type: e.type,
            dureeMinutes: e.dureeMinutes,
            prix: e.prix,
            description: e.description,
            ligne: e.ligne
              ? {
                  id: e.ligne.id,
                  nom_ligne: e.ligne.nom_ligne,
                  type: e.ligne.type,
                  depart_gare: e.ligne.depart_gare,
                  arrivee_gare: e.ligne.arrivee_gare,
                  depart_reperes: e.ligne.depart_reperes,
                }
              : null,
          })),
          partage_at: new Date().toISOString(),
        };

        const { data: code, error } = await supabase.rpc('creer_partage', {
          p_itineraire: payload,
        });

        if (error) throw error;

        const url = `${BASE_URL}/t/${code}`;
        setLienCourt(url);
        return url;
      } catch (err) {
        setErreur(err.message);
        return null;
      } finally {
        setChargement(false);
      }
    },
    [lienCourt],
  );

  const partagerWhatsApp = useCallback(
    async (itineraire) => {
      const lien = await genererLien(itineraire);
      const texte = formaterPourWhatsApp(itineraire, lien ?? BASE_URL);
      window.open(construireUrlWhatsApp(texte), '_blank', 'noopener');
    },
    [genererLien],
  );

  const partagerSMS = useCallback(
    async (itineraire) => {
      const lien = await genererLien(itineraire);
      const texte = formaterPourSMS(itineraire, lien ?? '');
      window.location.href = construireUrlSMS(texte);
    },
    [genererLien],
  );

  const copierLien = useCallback(
    async (itineraire) => {
      const lien = await genererLien(itineraire);
      if (!lien) return { succes: false };

      try {
        await navigator.clipboard.writeText(lien);
        return { succes: true };
      } catch {
        return { succes: false, lien };
      }
    },
    [genererLien],
  );

  const partagerNatif = useCallback(
    async (itineraire) => {
      const lien = await genererLien(itineraire);
      const texte = formaterPourSMS(itineraire, '');

      if (!navigator.share) return false;

      try {
        await navigator.share({
          title: `Kotrou — ${itineraire.depart_nom || 'Départ'} → ${itineraire.arrivee_nom || 'Arrivée'}`,
          text: texte,
          url: lien ?? BASE_URL,
        });
        return true;
      } catch (err) {
        if (err.name === 'AbortError') return false;
        throw err;
      }
    },
    [genererLien],
  );

  const reinitialiser = useCallback(() => {
    setLienCourt(null);
    setErreur(null);
  }, []);

  return {
    chargement,
    lienCourt,
    erreur,
    genererLien,
    partagerWhatsApp,
    partagerSMS,
    copierLien,
    partagerNatif,
    reinitialiser,
    supporteWebShare: typeof navigator !== 'undefined' && !!navigator.share,
  };
}
