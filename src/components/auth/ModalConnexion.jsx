import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mail, Phone, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Bouton from '../ui/Bouton';

export default function ModalConnexion() {
  const { modalOuverte, fermerModal, envoyerOTP, verifierOTP, envoyerMagicLink } = useAuth();
  const [mode, setMode] = useState('email');
  const [etape, setEtape] = useState(1);
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [telNormalise, setTelNormalise] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputsRef = useRef([]);
  const telRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (modalOuverte) {
      setEtape(1);
      setEmail('');
      setTelephone('');
      setCode(['', '', '', '', '', '']);
      setErreur('');
      setMode('email');
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [modalOuverte]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleEnvoyerEmail = useCallback(async () => {
    if (!email || !email.includes('@')) {
      setErreur('Adresse email invalide');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      await envoyerMagicLink(email);
      setEtape(3);
    } catch (e) {
      if (e.message?.includes('rate')) {
        setErreur('Trop de tentatives. Réessaie dans quelques minutes.');
      } else {
        setErreur('Erreur lors de l\'envoi. Vérifie ton adresse.');
      }
    } finally {
      setEnvoi(false);
    }
  }, [email, envoyerMagicLink]);

  const handleEnvoyerOTP = useCallback(async () => {
    const chiffres = telephone.replace(/\D/g, '');
    if (chiffres.length < 8) {
      setErreur('Numéro invalide');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      const tel = await envoyerOTP(telephone);
      setTelNormalise(tel);
      setEtape(2);
      setCountdown(30);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (e) {
      if (e.message?.includes('rate')) {
        setErreur('Trop de tentatives. Réessaie dans 5 minutes.');
      } else {
        setErreur('Erreur lors de l\'envoi. Vérifie ton numéro.');
      }
    } finally {
      setEnvoi(false);
    }
  }, [telephone, envoyerOTP]);

  const handleCodeChange = useCallback((index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newCode = [...code];
      for (let i = 0; i < 6; i++) newCode[i] = digits[i] || '';
      setCode(newCode);
      const focusIdx = Math.min(digits.length, 5);
      inputsRef.current[focusIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }, [code]);

  const handleCodeKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }, [code]);

  const handleVerifier = useCallback(async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setErreur('Entre les 6 chiffres du code');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      await verifierOTP(telNormalise, codeStr);
      fermerModal();
    } catch {
      setErreur('Code incorrect. Vérifie et réessaie.');
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setEnvoi(false);
    }
  }, [code, telNormalise, verifierOTP, fermerModal]);

  const renvoyerCode = useCallback(async () => {
    if (countdown > 0) return;
    try {
      await envoyerOTP(telNormalise);
      setCountdown(30);
    } catch {
      setErreur('Impossible de renvoyer le code.');
    }
  }, [countdown, telNormalise, envoyerOTP]);

  if (!modalOuverte) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={fermerModal} />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl p-6 pb-8 animate-slide-up">
        <button
          onClick={fermerModal}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {etape === 1 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 bg-kotrou-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                {mode === 'email'
                  ? <Mail className="w-7 h-7 text-kotrou-orange" />
                  : <Phone className="w-7 h-7 text-kotrou-orange" />}
              </div>
              <h2 className="text-lg font-bold text-kotrou-gris">Connexion</h2>
              <p className="text-sm text-gray-400 mt-1">
                {mode === 'email'
                  ? 'Entre ton email pour recevoir un lien de connexion.'
                  : 'Entre ton numéro pour recevoir un code.'}
              </p>
            </div>

            {mode === 'email' ? (
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErreur(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEnvoyerEmail()}
                placeholder="ton.email@exemple.com"
                className="w-full h-12 px-4 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-kotrou-orange focus:border-transparent"
              />
            ) : (
              <div className="flex gap-2">
                <div className="w-16 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-sm font-semibold text-kotrou-gris">
                  +225
                </div>
                <input
                  ref={telRef}
                  type="tel"
                  value={telephone}
                  onChange={(e) => { setTelephone(e.target.value); setErreur(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnvoyerOTP()}
                  placeholder="07 XX XX XX XX"
                  className="flex-1 h-12 px-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-kotrou-orange focus:border-transparent"
                />
              </div>
            )}

            {erreur && <p className="text-xs text-kotrou-rouge text-center">{erreur}</p>}

            <Bouton
              fullWidth
              onClick={mode === 'email' ? handleEnvoyerEmail : handleEnvoyerOTP}
              chargement={envoi}
              icone={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'email' ? 'Recevoir le lien' : 'Recevoir le code'}
            </Bouton>

            <button
              onClick={() => {
                setMode(mode === 'email' ? 'phone' : 'email');
                setErreur('');
                setTimeout(() => (mode === 'email' ? telRef : emailRef).current?.focus(), 100);
              }}
              className="w-full text-center text-sm text-kotrou-orange font-medium active:underline"
            >
              {mode === 'email' ? 'Utiliser mon numéro de téléphone' : 'Utiliser mon email'}
            </button>
          </div>
        )}

        {etape === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-kotrou-gris">Code reçu</h2>
              <p className="text-sm text-gray-400 mt-1">
                Code envoyé au {telNormalise.slice(0, 7)}…{telNormalise.slice(-2)}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={i === 0 ? 6 : 1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className={`w-11 h-12 text-center text-lg font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-kotrou-orange focus:border-transparent ${
                    erreur ? 'border-kotrou-rouge' : 'border-gray-300'
                  }`}
                />
              ))}
            </div>

            {erreur && <p className="text-xs text-kotrou-rouge text-center">{erreur}</p>}

            <div className="text-center">
              <button
                onClick={renvoyerCode}
                disabled={countdown > 0}
                className={`text-sm ${countdown > 0 ? 'text-gray-400' : 'text-kotrou-orange font-medium active:underline'}`}
              >
                {countdown > 0 ? `Renvoyer le code (${countdown}s)` : 'Renvoyer le code'}
              </button>
            </div>

            <Bouton fullWidth onClick={handleVerifier} chargement={envoi} icone={<Check className="w-4 h-4" />}>
              Confirmer
            </Bouton>
          </div>
        )}

        {etape === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 bg-kotrou-vert/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-kotrou-vert" />
              </div>
              <h2 className="text-lg font-bold text-kotrou-gris">Vérifie ta boîte mail</h2>
              <p className="text-sm text-gray-400 mt-2">
                Un lien de connexion a été envoyé à
              </p>
              <p className="text-sm font-semibold text-kotrou-gris mt-1">{email}</p>
              <p className="text-xs text-gray-400 mt-3">
                Clique sur le lien dans l'email pour te connecter. Vérifie tes spams si tu ne le vois pas.
              </p>
            </div>

            <Bouton fullWidth variante="secondaire" onClick={fermerModal}>
              Compris
            </Bouton>
          </div>
        )}
      </div>
    </div>
  );
}
