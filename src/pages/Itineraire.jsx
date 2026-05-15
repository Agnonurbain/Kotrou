import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { fr } from '../i18n/fr';
import Header from '../components/layout/Header';
import Carte from '../components/carte/Carte';
import CarteEtape from '../components/itineraire/CarteEtape';
import PrixTotal from '../components/itineraire/PrixTotal';
import Chargement from '../components/ui/Chargement';
import EtatVide from '../components/ui/EtatVide';
import Bouton from '../components/ui/Bouton';
import BoutonSignalement from '../components/signalement/BoutonSignalement';
import Toast from '../components/ui/Toast';
import { useLignes } from '../hooks/useLignes';

function labelOnglet(it, index) {
  if (it.direct) return 'Direct';
  if (it.hub) return `Via ${it.hub}`;
  return `Option ${index + 1}`;
}

export default function Itineraire() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { chercher } = useLignes();

  const [itineraires, setItineraires] = useState(null);
  const [actif, setActif] = useState(0);
  const [etat, setEtat] = useState('loading');
  const [toast, setToast] = useState(null);

  const depLat = parseFloat(params.get('dep_lat'));
  const depLng = parseFloat(params.get('dep_lng'));
  const depNom = params.get('dep_nom') || 'Départ';
  const arrLat = parseFloat(params.get('arr_lat'));
  const arrLng = parseFloat(params.get('arr_lng'));
  const arrNom = params.get('arr_nom') || 'Arrivée';

  const valide = !isNaN(depLat) && !isNaN(depLng) && !isNaN(arrLat) && !isNaN(arrLng);

  const lancer = useCallback(async () => {
    if (!valide) { setEtat('error'); return; }
    setEtat('loading');
    try {
      const res = await chercher(
        { lat: depLat, lng: depLng, nom: depNom },
        { lat: arrLat, lng: arrLng, nom: arrNom },
      );
      setItineraires(res);
      setActif(0);
      setEtat(res.length > 0 ? 'success' : 'empty');
    } catch {
      setEtat('error');
    }
  }, [valide, depLat, depLng, depNom, arrLat, arrLng, arrNom, chercher]);

  useEffect(() => { lancer(); }, [lancer]);

  const it = itineraires?.[actif] || null;
  const nbCorresp = it ? it.etapes.filter((e) => e.description?.includes('Correspondance')).length : 0;

  const centre = it?.etapes?.[0]?.ligne?.depart_coords
    ? undefined
    : valide ? { lat: (depLat + arrLat) / 2, lng: (depLng + arrLng) / 2 } : undefined;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond flex flex-col">
      <Header titre={fr.itineraire.titre} retour />

      {etat === 'loading' && (
        <div className="p-4 space-y-4">
          <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          <Chargement type="itineraire" nb={3} />
        </div>
      )}

      {etat === 'error' && (
        <div className="p-4 flex flex-col items-center gap-4 pt-12">
          <AlertTriangle className="w-12 h-12 text-kotrou-rouge" />
          <p className="text-kotrou-gris text-center">{fr.erreurs.serveur}</p>
          <Bouton variante="primaire" onClick={lancer}>Réessayer</Bouton>
        </div>
      )}

      {etat === 'empty' && (
        <div className="p-4">
          <EtatVide type="itineraire" onAction={() => navigate('/contribuer')} />
        </div>
      )}

      {etat === 'success' && it && (
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="h-40 relative">
            <Carte centre={centre} zoom={13} itineraire={it} className="absolute inset-0 rounded-none" />
          </div>

          {itineraires.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto">
              {itineraires.slice(0, 3).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setActif(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    i === actif ? 'bg-kotrou-orange text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {labelOnglet(opt, i)}
                  {' · '}
                  {opt.prixTotal > 0 ? `${opt.prixTotal} F` : '?'}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 space-y-4">
            <PrixTotal prix={it.prixTotal} duree={it.dureeTotal} nbCorrespondances={nbCorresp} />

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              {it.etapes.map((etape, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (etape.ligne?.id) navigate(`/detail/${etape.ligne.id}`);
                  }}
                  className={etape.ligne?.id ? 'cursor-pointer' : ''}
                >
                  <CarteEtape etape={etape} index={i} estDerniere={i === it.etapes.length - 1} />
                </div>
              ))}
            </div>

            <Bouton
              variante="secondaire"
              fullWidth
              icone={<AlertTriangle className="w-4 h-4" />}
              onClick={() => setToast({ message: fr.signalement.merci, type: 'info' })}
            >
              Signaler un problème
            </Bouton>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
