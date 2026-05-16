import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Coins, Bus, Footprints, AlertTriangle, Download } from 'lucide-react';
import { supabase } from '../supabase';
import { formaterPrix } from '../lib/prix';
import BadgePrixActuel from '../components/prix/BadgePrixActuel';
import { usePrix } from '../hooks/usePrix';
import Bouton from '../components/ui/Bouton';
import Chargement from '../components/ui/Chargement';

const COULEURS_TYPE = {
  gbaka: { bg: 'bg-transport-gbaka', label: '🟠' },
  woro: { bg: 'bg-transport-woro', label: '🔵' },
  sotra: { bg: 'bg-transport-sotra', label: '🟣' },
};

function EtapePartage({ etape, estDerniere }) {
  const Icone = etape.type === 'marche' ? Footprints : Bus;
  const couleurBg =
    etape.type === 'marche' ? 'bg-transport-marche' : COULEURS_TYPE[etape.type]?.bg || 'bg-transport-gbaka';
  const { prixActuel } = usePrix(etape.type !== 'marche' ? etape.ligne?.id : null);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${couleurBg}`}>
          <Icone className="w-4 h-4" />
        </div>
        {!estDerniere && <div className={`w-0.5 flex-1 min-h-[24px] mt-1 ${couleurBg} opacity-30`} />}
      </div>
      <div className="flex-1 pb-4">
        {etape.type === 'marche' ? (
          <>
            <p className="text-sm text-kotrou-gris">À pied {etape.dureeMinutes} min</p>
            {etape.description && <p className="text-xs text-gray-400 mt-0.5">{etape.description}</p>}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-kotrou-gris">{etape.ligne?.nom_ligne || etape.description}</p>
            {etape.ligne?.depart_gare && (
              <p className="text-xs text-gray-400 mt-0.5">↗ Monter : {etape.ligne.depart_gare}</p>
            )}
            {etape.ligne?.arrivee_gare && (
              <p className="text-xs text-gray-400">↘ Descendre : {etape.ligne.arrivee_gare}</p>
            )}
            {etape.ligne?.depart_reperes && (
              <p className="text-xs text-gray-400">📍 {etape.ligne.depart_reperes}</p>
            )}
            <div className="mt-1.5">
              <BadgePrixActuel prixBase={etape.prix} prixActuel={prixActuel} compact />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ageCourt(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60;
  if (diff < 2) return "à l'instant";
  if (diff < 60) return `il y a ${Math.round(diff)} min`;
  if (diff < 1440) return `il y a ${Math.round(diff / 60)}h`;
  return `il y a ${Math.round(diff / 1440)}j`;
}

export default function Partage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [donnees, setDonnees] = useState(null);
  const [etat, setEtat] = useState('loading');

  useEffect(() => {
    if (!code) { setEtat('expire'); return; }

    supabase
      .rpc('lire_partage', { p_code: code })
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setEtat('expire'); return; }
        setDonnees(data);
        setEtat('success');
      });
  }, [code]);

  if (etat === 'loading') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond">
        <div className="bg-kotrou-orange text-white h-14 flex items-center px-4">
          <h1 className="text-lg font-bold">Kotrou</h1>
        </div>
        <div className="p-4">
          <Chargement type="itineraire" nb={3} />
        </div>
      </div>
    );
  }

  if (etat === 'expire') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond">
        <div className="bg-kotrou-orange text-white h-14 flex items-center px-4">
          <h1 className="text-lg font-bold">Kotrou</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-kotrou-gris mb-2">Ce lien n'est plus disponible</h2>
          <p className="text-sm text-gray-400 mb-6">
            Les itinéraires partagés expirent après 30 jours.
          </p>
          <Bouton variante="primaire" onClick={() => navigate('/')}>
            Calculer un nouvel itinéraire
          </Bouton>
        </div>
      </div>
    );
  }

  const it = donnees.itineraire;
  const etapes = it.etapes || [];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-8">
      <div className="bg-kotrou-orange text-white h-14 flex items-center px-4">
        <h1 className="text-lg font-bold">Kotrou</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-base font-bold text-kotrou-gris">
            {donnees.depart_nom} → {donnees.arrivee_nom}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-kotrou-orange" />
              {formaterPrix(donnees.prix_total)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-kotrou-orange" />
              {donnees.duree_total} min
            </span>
            {it.direct && (
              <span className="text-xs text-kotrou-vert font-medium">Direct</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Partagé {ageCourt(donnees.created_at)} · {donnees.nb_vues} vue{donnees.nb_vues > 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Étapes</p>
          {etapes.map((etape, i) => (
            <EtapePartage key={i} etape={etape} estDerniere={i === etapes.length - 1} />
          ))}
        </div>

        <p className="text-[10px] text-gray-400 text-center">
          Prix mis à jour à l'instant
        </p>

        <div className="space-y-2 pt-2">
          <Bouton
            variante="primaire"
            fullWidth
            icone={<Download className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Ouvrir Kotrou
          </Bouton>

          <Bouton
            variante="secondaire"
            fullWidth
            icone={<MapPin className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Calculer un nouveau trajet
          </Bouton>
        </div>
      </div>
    </div>
  );
}
