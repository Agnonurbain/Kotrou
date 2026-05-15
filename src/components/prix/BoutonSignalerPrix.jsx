import { useState } from 'react';
import { Coins } from 'lucide-react';
import ModalSignalerPrix from './ModalSignalerPrix';
import { usePrix } from '../../hooks/usePrix';
import { useAuth } from '../../hooks/useAuth';

export default function BoutonSignalerPrix({ ligneId, nomLigne, prixBase, onSignalement }) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const { utilisateur, demanderConnexion } = useAuth();
  const { signalerPrix } = usePrix(ligneId);

  const handleOuvrir = () => {
    if (!utilisateur) { demanderConnexion(); return; }
    setModalOuverte(true);
  };

  const handleSucces = async (params) => {
    const resultat = await signalerPrix(params);
    if (resultat.succes) {
      setModalOuverte(false);
      onSignalement?.();
    }
    return resultat;
  };

  return (
    <>
      <button
        onClick={handleOuvrir}
        className="w-full bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 active:bg-gray-50"
      >
        <div className="w-10 h-10 bg-kotrou-orange/10 rounded-full flex items-center justify-center shrink-0">
          <Coins className="w-5 h-5 text-kotrou-orange" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-kotrou-gris">Tu as pris cette ligne ?</p>
          <p className="text-xs text-gray-400">Signale le prix que tu as payé</p>
        </div>
      </button>

      {modalOuverte && (
        <ModalSignalerPrix
          ligneId={ligneId}
          nomLigne={nomLigne}
          prixBase={prixBase}
          onFermer={() => setModalOuverte(false)}
          onSucces={handleSucces}
        />
      )}
    </>
  );
}
