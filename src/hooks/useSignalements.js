import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useSignalements() {
  const [signalements, setSignalements] = useState([]);

  const ecouter = useCallback((centre, rayonMetres, callback) => {
    const channel = supabase
      .channel('signalements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signalements' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          callback?.({ type: 'nouveau', data: payload.new });
        }
      })
      .subscribe();

    supabase
      .from('signalements')
      .select('*')
      .gt('expire_at', new Date().toISOString())
      .then(({ data }) => {
        if (data) {
          setSignalements(data);
          callback?.({ type: 'initial', data });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const creer = useCallback(async (type, coords, description) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentification requise');

    const { data, error } = await supabase
      .from('signalements')
      .insert({
        type,
        coords: `POINT(${coords.lng} ${coords.lat})`,
        description,
        user_id: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const dansZone = useCallback(async (bbox) => {
    const { data, error } = await supabase
      .from('signalements')
      .select('*')
      .gt('expire_at', new Date().toISOString());
    if (error) throw error;
    return data || [];
  }, []);

  return { signalements, ecouter, creer, dansZone };
}
