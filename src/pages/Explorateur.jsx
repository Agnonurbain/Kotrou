import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Plus } from 'lucide-react';
import { fr } from '../i18n/fr';
import { COMMUNES } from '../data/communes';
import { QUARTIERS } from '../data/quartiers';
import { supabase } from '../supabase';
import { getLignesLocales } from '../lib/db-locale';
import Header from '../components/layout/Header';
import BadgeTransport from '../components/itineraire/BadgeTransport';
import Badge from '../components/ui/Badge';
import Chargement from '../components/ui/Chargement';
import EtatVide from '../components/ui/EtatVide';
import Bouton from '../components/ui/Bouton';

export default function Explorateur() {
  const navigate = useNavigate();
  const [commune, setCommune] = useState(null);
  const [quartier, setQuartier] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [etat, setEtat] = useState('idle');

  const retour = () => {
    if (quartier) { setQuartier(null); setLignes([]); setEtat('idle'); }
    else if (commune) { setCommune(null); }
  };

  const titre = quartier
    ? `Lignes depuis ${quartier}`
    : commune
      ? `Quartiers de ${COMMUNES.find((c) => c.id === commune)?.nom || commune}`
      : fr.navigation.explorer;

  const chargerLignes = useCallback(async (communeId, quartierNom) => {
    setEtat('loading');
    try {
      let data;
      if (navigator.onLine) {
        let query = supabase
          .from('lignes_fiables')
          .select('*')
          .eq('depart_commune', communeId)
          .order('confiance', { ascending: false });
        if (quartierNom) {
          query = query.eq('depart_quartier', quartierNom);
        }
        const res = await query;
        data = res.data || [];
      } else {
        const locales = await getLignesLocales(communeId);
        data = quartierNom ? locales.filter((l) => l.depart_quartier === quartierNom) : locales;
      }
      setLignes(data);
      setEtat(data.length > 0 ? 'success' : 'empty');
    } catch {
      setEtat('error');
    }
  }, []);

  const choisirCommune = (id) => {
    setCommune(id);
    setQuartier(null);
    setLignes([]);
    setEtat('idle');
  };

  const choisirQuartier = (nom) => {
    setQuartier(nom);
    chargerLignes(commune, nom);
  };

  const quartiersCommune = commune ? (QUARTIERS[commune] || []) : [];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header titre={titre} retour={!!(commune || quartier)} />

      <div className="p-4">
        {!commune && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Communes d'Abidjan</p>
            <div className="flex flex-wrap gap-2">
              {COMMUNES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => choisirCommune(c.id)}
                  className="px-4 py-2.5 bg-white rounded-full border border-gray-200 text-sm font-medium text-kotrou-gris active:bg-kotrou-50 transition-colors min-h-[44px]"
                >
                  {c.nom}
                </button>
              ))}
            </div>
          </>
        )}

        {commune && !quartier && (
          <div className="space-y-1">
            {quartiersCommune.map((q) => (
              <button
                key={q}
                onClick={() => choisirQuartier(q)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 text-sm text-kotrou-gris active:bg-gray-50 min-h-[48px] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-kotrou-orange" />
                  <span>{q}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {commune && quartier && (
          <div className="space-y-3">
            {etat === 'loading' && <Chargement type="ligne" nb={4} />}

            {etat === 'empty' && (
              <EtatVide
                type="lignes"
                onAction={() => navigate(`/contribuer?commune=${commune}&quartier=${quartier}`)}
              />
            )}

            {etat === 'error' && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-3">{fr.erreurs.serveur}</p>
                <Bouton variante="primaire" taille="sm" onClick={() => chargerLignes(commune, quartier)}>
                  Réessayer
                </Bouton>
              </div>
            )}

            {etat === 'success' && (
              <>
                {lignes.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/detail/${l.id}`)}
                    className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <BadgeTransport type={l.type} />
                          <Badge type="confiance" valeur={String(l.confiance || 0)} />
                        </div>
                        <p className="text-sm font-semibold text-kotrou-gris truncate">{l.nom_ligne}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          → {l.arrivee_commune}
                          {l.duree ? ` · ${l.duree} min` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-kotrou-orange">
                          {l.prix ? `${l.prix} F` : fr.itineraire.prix_inconnu}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                <Bouton
                  variante="secondaire"
                  fullWidth
                  icone={<Plus className="w-4 h-4" />}
                  onClick={() => navigate(`/contribuer?commune=${commune}&quartier=${quartier}`)}
                >
                  Ajouter une ligne ici
                </Bouton>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
