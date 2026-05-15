import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useTrajets() {
  const { utilisateur } = useAuth();

  const mesTrajets = async () => {
    const { data, error } = await supabase
      .from('trajets_favoris')
      .select('*')
      .eq('user_id', utilisateur.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  const sauvegarder = async (trajet) => {
    const { data, error } = await supabase
      .from('trajets_favoris')
      .insert({
        user_id: utilisateur.id,
        nom: trajet.nom,
        depart_nom: trajet.departNom,
        depart_coords: `POINT(${trajet.departCoords.lng} ${trajet.departCoords.lat})`,
        arrivee_nom: trajet.arriveeNom,
        arrivee_coords: `POINT(${trajet.arriveeCoords.lng} ${trajet.arriveeCoords.lat})`,
        trajet_line: null,
        heure_depart: trajet.heureDepart || null,
        heure_arrivee: trajet.heureArrivee || null,
        jours_actifs: trajet.joursActifs || ['lun', 'mar', 'mer', 'jeu', 'ven'],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const toggleAlertes = async (trajetId, actif) => {
    const { error } = await supabase
      .from('trajets_favoris')
      .update({ alertes_actives: actif })
      .eq('id', trajetId)
      .eq('user_id', utilisateur.id);

    if (error) throw error;
  };

  const supprimer = async (trajetId) => {
    const { error } = await supabase
      .from('trajets_favoris')
      .delete()
      .eq('id', trajetId)
      .eq('user_id', utilisateur.id);

    if (error) throw error;
  };

  return { mesTrajets, sauvegarder, toggleAlertes, supprimer };
}
