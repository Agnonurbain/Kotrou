import { useState, useEffect } from 'react';
import { X, MessageCircle, MessageSquare, Link2, Share2, Check, Copy } from 'lucide-react';
import { usePartage } from '../../hooks/usePartage';
import { formaterPourSMS, compterSMS } from '../../lib/partage';
import { formaterPrix } from '../../lib/prix';
import Bouton from '../ui/Bouton';

export default function ModalPartage({ itineraire, ouvert, onFermer }) {
  const {
    chargement,
    lienCourt,
    genererLien,
    partagerWhatsApp,
    partagerSMS,
    copierLien,
    partagerNatif,
    supporteWebShare,
  } = usePartage();

  const [lienCopie, setLienCopie] = useState(false);
  const [texteCopie, setTexteCopie] = useState(false);

  useEffect(() => {
    if (ouvert && itineraire) genererLien(itineraire);
  }, [ouvert]);

  if (!ouvert || !itineraire) return null;

  const depNom = itineraire.depart_nom || itineraire.depart?.nom || 'Départ';
  const arrNom = itineraire.arrivee_nom || itineraire.arrivee?.nom || 'Arrivée';
  const texteSMS = formaterPourSMS(itineraire, lienCourt || '');
  const nbSMS = compterSMS(texteSMS);

  const handleCopierLien = async () => {
    const res = await copierLien(itineraire);
    if (res.succes) {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    }
  };

  const handleCopierTexte = async () => {
    try {
      await navigator.clipboard.writeText(texteSMS);
      setTexteCopie(true);
      setTimeout(() => setTexteCopie(false), 2000);
    } catch {
      // Clipboard non disponible
    }
  };

  const handleWhatsApp = async () => {
    await partagerWhatsApp(itineraire);
    onFermer();
  };

  const handleSMS = async () => {
    await partagerSMS(itineraire);
    onFermer();
  };

  const handleNatif = async () => {
    const ok = await partagerNatif(itineraire);
    if (ok) onFermer();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-kotrou-gris">Partager cet itinéraire</p>
          <button onClick={onFermer}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="text-sm text-kotrou-gris">
          <p className="font-semibold">{depNom} → {arrNom}</p>
          <p className="text-xs text-gray-400">
            {formaterPrix(itineraire.prixTotal)} · {itineraire.dureeTotal} min
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleWhatsApp}
            disabled={chargement}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#25D366] text-white font-semibold active:opacity-90 disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="flex-1 text-left text-sm">WhatsApp</span>
            <span className="text-xs opacity-80">Recommandé</span>
          </button>

          <button
            onClick={handleSMS}
            disabled={chargement}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-blue-500 text-white font-semibold active:opacity-90 disabled:opacity-50"
          >
            <MessageSquare className="w-5 h-5" />
            <div className="flex-1 text-left">
              <span className="text-sm">SMS</span>
              <span className="block text-[10px] opacity-80">Tous téléphones, même sans internet</span>
            </div>
          </button>

          <button
            onClick={handleCopierLien}
            disabled={chargement}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-100 text-kotrou-gris font-medium active:bg-gray-200 disabled:opacity-50"
          >
            {lienCopie ? (
              <Check className="w-5 h-5 text-kotrou-vert" />
            ) : (
              <Link2 className="w-5 h-5" />
            )}
            <span className="text-sm">{lienCopie ? 'Lien copié !' : 'Copier le lien'}</span>
          </button>

          {supporteWebShare && (
            <button
              onClick={handleNatif}
              disabled={chargement}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-100 text-kotrou-gris font-medium active:bg-gray-200 disabled:opacity-50"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Autres applis (Telegram...)</span>
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-400">Aperçu du message SMS</p>
            <button
              onClick={handleCopierTexte}
              className="flex items-center gap-1 text-xs text-kotrou-orange font-medium"
            >
              {texteCopie ? (
                <>
                  <Check className="w-3 h-3" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copier texte
                </>
              )}
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-gray-200">
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
              {texteSMS}
            </pre>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {nbSMS} SMS · {texteSMS.length} caractères
          </p>
        </div>
      </div>
    </div>
  );
}
