import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../supabase';
import { BADGES } from '../data/badges';

const AuthContext = createContext(null);

function normaliserTelephone(tel) {
  const chiffres = tel.replace(/\D/g, '');
  if (chiffres.startsWith('225')) return `+${chiffres}`;
  if (chiffres.startsWith('0')) return `+225${chiffres.slice(1)}`;
  if (chiffres.length === 10) return `+225${chiffres}`;
  return `+225${chiffres}`;
}

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [profil, setProfil] = useState(null);
  const [enAttente, setEnAttente] = useState(true);
  const [modalOuverte, setModalOuverte] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUtilisateur(session?.user || null);
      if (session?.user) chargerProfil(session.user.id);
      setEnAttente(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUtilisateur(session?.user || null);
      if (session?.user) chargerProfil(session.user.id);
      else setProfil(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const chargerProfil = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profils')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfil(data);
  }, []);

  const envoyerOTP = useCallback(async (telephone) => {
    const tel = normaliserTelephone(telephone);
    const { error } = await supabase.auth.signInWithOtp({ phone: tel });
    if (error) throw error;
    return tel;
  }, []);

  const verifierOTP = useCallback(async (telephone, code) => {
    const tel = normaliserTelephone(telephone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: tel,
      token: code,
      type: 'sms',
    });
    if (error) throw error;

    if (data.user) {
      const { data: existant } = await supabase
        .from('profils')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existant) {
        await supabase.from('profils').insert({
          id: data.user.id,
          telephone: tel,
          points: 0,
          contributions: 0,
          badges: [],
        });
      }

      await chargerProfil(data.user.id);
    }

    return data;
  }, [chargerProfil]);

  const seDeconnecter = useCallback(async () => {
    await supabase.auth.signOut();
    setUtilisateur(null);
    setProfil(null);
  }, []);

  const rafraichirProfil = useCallback(async () => {
    if (utilisateur) await chargerProfil(utilisateur.id);
  }, [utilisateur, chargerProfil]);

  const demanderConnexion = useCallback(() => {
    setModalOuverte(true);
  }, []);

  const fermerModal = useCallback(() => {
    setModalOuverte(false);
  }, []);

  const badgesDebloques = useCallback(() => {
    if (!profil) return [];
    return BADGES.filter((b) => {
      if (b.commune) {
        return (profil.badges || []).includes(b.id);
      }
      return b.seuil && profil.contributions >= b.seuil;
    });
  }, [profil]);

  const valeur = {
    utilisateur,
    profil,
    enAttente,
    envoyerOTP,
    verifierOTP,
    seDeconnecter,
    rafraichirProfil,
    badgesDebloques,
    modalOuverte,
    demanderConnexion,
    fermerModal,
  };

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
