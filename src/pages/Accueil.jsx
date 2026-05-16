import { useState, useEffect, useCallback } from 'react';
import { LogIn } from 'lucide-react';
import { fr } from '../i18n/fr';
import { supabase } from '../supabase';
import { usePosition } from '../hooks/usePosition';
import { useSignalements } from '../hooks/useSignalements';
import { useGpsBus } from '../hooks/useGpsBus';
import { useAuth } from '../hooks/useAuth';
import Carte from '../components/carte/Carte';
import BarreRecherche from '../components/recherche/BarreRecherche';
import BoutonSignalement from '../components/signalement/BoutonSignalement';
import BoutonGbaka from '../components/carte/BoutonGbaka';
import ModalTrajetEnCours from '../components/modals/ModalTrajetEnCours';
import ModalFinTrajet from '../components/modals/ModalFinTrajet';
import BanniereOffline from '../components/ui/BanniereOffline';
import CarteEtape from '../components/itineraire/CarteEtape';
import PrixTotal from '../components/itineraire/PrixTotal';
import EtatVide from '../components/ui/EtatVide';
import Toast from '../components/ui/Toast';

const ABIDJAN = { lat: 5.3196, lng: -4.0167 };

export default function Accueil() {
  const { coords } = usePosition();
  const { signalements, ecouter } = useSignalements();
  const { utilisateur, demanderConnexion } = useAuth();
  const gpsBus = useGpsBus();
  const [gares, setGares] = useState([]);
  const [itineraires, setItineraires] = useState(null);
  const [itineraireActif, setItineraireActif] = useState(null);
  const [sheetOuvert, setSheetOuvert] = useState(false);
  const [toast, setToast] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [modalDepart, setModalDepart] = useState(false);
  const [modalFin, setModalFin] = useState(false);

  const centre = coords || ABIDJAN;

  useEffect(() => {
    const unsub = ecouter(centre, 5000);
    return unsub;
  }, [centre.lat, centre.lng]);

  useEffect(() => {
    if (!navigator.onLine) return;
    supabase
      .from('lignes')
      .select('id, depart_gare, depart_coords, depart_commune, type, confiance')
      .order('confiance', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          setGares(data.map((g) => ({
            id: g.id,
            nom: g.depart_gare,
            type: g.type,
            coords: g.depart_coords,
            confiance: g.confiance,
          })));
        }
      });
  }, []);

  const handleItineraires = useCallback((resultats) => {
    setItineraires(resultats);
    if (resultats.length > 0) {
      setItineraireActif(resultats[0]);
      setSheetOuvert(true);
    } else {
      setItineraireActif(null);
      setSheetOuvert(true);
    }
  }, []);

  const handleSignaler = useCallback((type) => {
    setToast({ message: fr.signalement.merci, type: 'succes' });
  }, []);

  const handleDemarrerGbaka = useCallback(() => {
    if (!utilisateur) { demanderConnexion(); return; }
    setModalDepart(true);
  }, [utilisateur, demanderConnexion]);

  const handleLancerEnregistrement = useCallback((ligne) => {
    setModalDepart(false);
    gpsBus.demarrer(ligne);
  }, [gpsBus.demarrer]);

  const handleTerminerGbaka = useCallback(async (ligneFinale) => {
    setModalFin(false);
    const resultat = await gpsBus.terminer(ligneFinale);
    if (resultat.succes) {
      setToast({
        message: `Merci ! ${resultat.nbPointsValides} points GPS envoyés (${resultat.distanceKm} km).`,
        type: 'succes',
      });
    } else {
      setToast({ message: resultat.raison, type: 'erreur' });
    }
  }, [gpsBus.terminer]);

  const handlePasserSansLigne = useCallback(async () => {
    setModalFin(false);
    const resultat = await gpsBus.terminer(null);
    if (resultat.succes) {
      setToast({ message: 'Trace envoyée ! Merci pour ta contribution.', type: 'succes' });
    } else {
      setToast({ message: resultat.raison, type: 'erreur' });
    }
  }, [gpsBus.terminer]);

  const nbCorrespondances = itineraireActif
    ? itineraireActif.etapes.filter((e) => e.description?.includes('Correspondance')).length
    : 0;

  return (
    <div className="relative h-[calc(100vh-64px)] flex flex-col">
      <BanniereOffline />

      <div className="flex-1 relative">
        <Carte
          centre={centre}
          marqueurs={gares}
          signalements={signalements}
          itineraire={itineraireActif}
          className="absolute inset-0"
        />

        <div className="absolute top-3 left-3 right-3 z-10">
          <BarreRecherche
            onItineraireCalcule={handleItineraires}
            onChargement={setChargement}
          />
        </div>

        <BoutonSignalement onSignaler={handleSignaler} />

        {!sheetOuvert && (
          <BoutonGbaka
            actif={gpsBus.actif}
            nbPoints={gpsBus.nbPoints}
            distanceKm={gpsBus.distanceKm}
            wakeLockActif={gpsBus.wakeLockActif}
            onDemarrer={handleDemarrerGbaka}
            onTerminer={() => setModalFin(true)}
          />
        )}
      </div>

      {sheetOuvert && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/10"
            onClick={() => setSheetOuvert(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col animate-slide-up">
            <div className="flex justify-center py-2">
              <button
                onClick={() => setSheetOuvert(false)}
                className="w-10 h-1.5 bg-gray-300 rounded-full"
              />
            </div>

            {itineraires && itineraires.length > 0 ? (
              <div className="overflow-y-auto px-4 pb-4 space-y-3">
                {itineraires.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {itineraires.map((it, i) => (
                      <button
                        key={i}
                        onClick={() => setItineraireActif(it)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          it === itineraireActif
                            ? 'bg-kotrou-orange text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {it.direct ? 'Direct' : `Via ${it.hub || 'correspondance'}`}
                        {' · '}
                        {it.prixTotal > 0 ? `${it.prixTotal} F` : fr.itineraire.prix_inconnu}
                      </button>
                    ))}
                  </div>
                )}

                {itineraireActif && (
                  <>
                    <PrixTotal
                      prix={itineraireActif.prixTotal}
                      duree={itineraireActif.dureeTotal}
                      nbCorrespondances={nbCorrespondances}
                    />
                    <div className="pt-2">
                      {itineraireActif.etapes.map((etape, i) => (
                        <CarteEtape
                          key={i}
                          etape={etape}
                          index={i}
                          estDerniere={i === itineraireActif.etapes.length - 1}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="px-4 pb-4">
                <EtatVide type="itineraire" />
              </div>
            )}
          </div>
        </>
      )}

      <ModalTrajetEnCours
        ouvert={modalDepart}
        onFermer={() => setModalDepart(false)}
        onDemarrer={handleLancerEnregistrement}
      />

      <ModalFinTrajet
        ouvert={modalFin}
        onFermer={() => setModalFin(false)}
        onEnvoyer={handleTerminerGbaka}
        onPasser={handlePasserSansLigne}
        lignePreSelectee={gpsBus.ligneSelectee}
        nbPoints={gpsBus.nbPoints}
        distanceKm={gpsBus.distanceKm}
        dureeMinutes={
          gpsBus.pointsBruts.length >= 2
            ? Math.round(
                (gpsBus.pointsBruts.at(-1).timestamp - gpsBus.pointsBruts[0].timestamp) / 60_000,
              )
            : 0
        }
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
