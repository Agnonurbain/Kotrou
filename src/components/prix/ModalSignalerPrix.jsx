import { useState } from 'react';
import { X } from 'lucide-react';
import Bouton from '../ui/Bouton';
import {
  detecterContexte,
  LIBELLES_CONTEXTE,
  ICONES_CONTEXTE,
  genererValeursRapides,
} from '../../lib/prix';

const CONTEXTES_ORDRE = [
  'normal',
  'pointe_matin',
  'pointe_soir',
  'nuit',
  'weekend',
  'pluie',
  'evenement',
  'ferie',
  'fin_annee',
];

export default function ModalSignalerPrix({ ligneId, nomLigne, prixBase, onFermer, onSucces }) {
  const contexteDetecte = detecterContexte();
  const [contexte, setContexte] = useState(contexteDetecte);
  const [prixChoisi, setPrixChoisi] = useState(null);
  const [montantLibre, setMontantLibre] = useState('');
  const [saisiLibre, setSaisiLibre] = useState(false);
  const [note, setNote] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valeurs = genererValeursRapides(prixBase);
  const prixFinal = saisiLibre ? parseInt(montantLibre, 10) : prixChoisi;

  const handleEnvoyer = async () => {
    if (!prixFinal || prixFinal < 50 || prixFinal > 10000) {
      setErreur('Entre un prix entre 50 et 10 000 F');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const resultat = await onSucces({ prixObserve: prixFinal, contexte, note: note.trim() || null });
    setEnvoi(false);
    if (resultat && !resultat.succes) {
      setErreur(resultat.raison);
    }
  };

  const ordonne = [...CONTEXTES_ORDRE].sort((a, b) => {
    if (a === contexteDetecte) return -1;
    if (b === contexteDetecte) return 1;
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-kotrou-gris">Prix que tu as payé</p>
          <button onClick={onFermer}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {nomLigne && <p className="text-xs text-gray-400 -mt-2">{nomLigne}</p>}

        <div>
          <p className="text-xs text-gray-400 mb-2">
            Contexte détecté : {ICONES_CONTEXTE[contexteDetecte]} {LIBELLES_CONTEXTE[contexteDetecte]}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ordonne.map((c) => (
              <button
                key={c}
                onClick={() => setContexte(c)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  contexte === c
                    ? 'bg-kotrou-orange text-white'
                    : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                }`}
              >
                {ICONES_CONTEXTE[c]} {LIBELLES_CONTEXTE[c]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Combien tu as payé ?</p>
          {!saisiLibre ? (
            <div className="grid grid-cols-3 gap-2">
              {valeurs.map((v) => (
                <button
                  key={v}
                  onClick={() => { setPrixChoisi(v); setErreur(null); }}
                  className={`h-14 rounded-xl text-sm font-bold transition-colors ${
                    prixChoisi === v
                      ? 'bg-kotrou-orange text-white'
                      : 'bg-gray-100 text-kotrou-gris active:bg-gray-200'
                  }`}
                >
                  {v} F
                </button>
              ))}
              <button
                onClick={() => { setSaisiLibre(true); setPrixChoisi(null); }}
                className="h-14 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 active:bg-gray-200"
              >
                Autre...
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={montantLibre}
                onChange={(e) => { setMontantLibre(e.target.value); setErreur(null); }}
                placeholder="Montant en FCFA"
                autoFocus
                className="flex-1 h-14 px-4 border border-gray-200 rounded-xl text-lg font-bold text-kotrou-gris focus:outline-none focus:ring-2 focus:ring-kotrou-orange/30"
              />
              <button
                onClick={() => { setSaisiLibre(false); setMontantLibre(''); }}
                className="h-14 px-3 rounded-xl bg-gray-100 text-xs text-gray-500"
              >
                Retour
              </button>
            </div>
          )}
        </div>

        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel) — Ex : Chauffeur a refusé de baisser"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kotrou-orange/30"
          />
        </div>

        {erreur && (
          <p className="text-xs text-kotrou-rouge bg-kotrou-rouge/10 rounded-lg px-3 py-2">{erreur}</p>
        )}

        <Bouton
          variante="primaire"
          fullWidth
          chargement={envoi}
          disabled={!prixFinal}
          onClick={handleEnvoyer}
        >
          Envoyer
        </Bouton>
      </div>
    </div>
  );
}
