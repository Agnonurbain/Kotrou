import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Camera, X } from 'lucide-react';
import { fr } from '../i18n/fr';
import { supabase } from '../supabase';
import { COMMUNES } from '../data/communes';
import { QUARTIERS } from '../data/quartiers';
import { uploaderPhoto } from '../lib/upload-photo';
import Header from '../components/layout/Header';
import ChampTexte from '../components/ui/ChampTexte';
import ListeDeroulante from '../components/ui/ListeDeroulante';
import Bouton from '../components/ui/Bouton';
import BadgeTransport from '../components/itineraire/BadgeTransport';
import Toast from '../components/ui/Toast';

const TYPES = ['gbaka', 'woro', 'sotra'];
const COMMUNES_OPTIONS = COMMUNES.map((c) => ({ valeur: c.id, libelle: c.nom }));

function quartiersOptions(communeId) {
  return (QUARTIERS[communeId] || []).map((q) => ({ valeur: q, libelle: q }));
}

export default function Contribution() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ligneIdEdit = params.get('ligne_id');
  const communeInit = params.get('commune') || '';
  const quartierInit = params.get('quartier') || '';

  const [etape, setEtape] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState(null);
  const [erreurs, setErreurs] = useState({});

  const [type, setType] = useState('gbaka');
  const [communeDep, setCommuneDep] = useState(communeInit);
  const [quartierDep, setQuartierDep] = useState(quartierInit);
  const [gareDep, setGareDep] = useState('');
  const [reperes, setReperes] = useState('');

  const [nomLigne, setNomLigne] = useState('');
  const [communeArr, setCommuneArr] = useState('');
  const [prix, setPrix] = useState('');
  const [duree, setDuree] = useState('');
  const [horaireDebut, setHoraireDebut] = useState('05:00');
  const [horaireFin, setHoraireFin] = useState('22:00');

  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!ligneIdEdit) return;
    supabase.from('lignes').select('*').eq('id', ligneIdEdit).single().then(({ data }) => {
      if (!data) return;
      setType(data.type || 'gbaka');
      setCommuneDep(data.depart_commune || '');
      setQuartierDep(data.depart_quartier || '');
      setGareDep(data.depart_gare || '');
      setReperes(data.depart_reperes || '');
      setNomLigne(data.nom_ligne || '');
      setCommuneArr(data.arrivee_commune || '');
      setPrix(data.prix ? String(data.prix) : '');
      setDuree(data.duree ? String(data.duree) : '');
      setHoraireDebut(data.horaire_debut?.slice(0, 5) || '05:00');
      setHoraireFin(data.horaire_fin?.slice(0, 5) || '22:00');
    });
  }, [ligneIdEdit]);

  const validerEtape1 = () => {
    const e = {};
    if (!communeDep) e.communeDep = fr.erreurs.champ_requis;
    if (!quartierDep) e.quartierDep = fr.erreurs.champ_requis;
    if (!gareDep.trim()) e.gareDep = fr.erreurs.champ_requis;
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const validerEtape2 = () => {
    const e = {};
    if (!nomLigne.trim()) e.nomLigne = fr.erreurs.champ_requis;
    if (!communeArr) e.communeArr = fr.erreurs.champ_requis;
    const p = parseInt(prix, 10);
    if (!prix || isNaN(p) || p < 50 || p > 2000) e.prix = fr.erreurs.prix_invalide;
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const suivant = () => {
    if (etape === 1 && validerEtape1()) setEtape(2);
    else if (etape === 2 && validerEtape2()) setEtape(3);
  };

  const precedent = () => {
    setErreurs({});
    setEtape((e) => Math.max(1, e - 1));
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const soumettre = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ message: 'Connecte-toi pour contribuer', type: 'info' });
      return;
    }

    setEnvoi(true);
    try {
      const communeDepObj = COMMUNES.find((c) => c.id === communeDep);
      const communeArrObj = COMMUNES.find((c) => c.id === communeArr);

      const donnees = {
        nom_ligne: nomLigne.trim(),
        type,
        depart_commune: communeDep,
        depart_quartier: quartierDep,
        depart_gare: gareDep.trim(),
        depart_reperes: reperes.trim() || null,
        depart_coords: communeDepObj ? `POINT(${communeDepObj.centre.lng} ${communeDepObj.centre.lat})` : null,
        arrivee_commune: communeArr,
        arrivee_coords: communeArrObj ? `POINT(${communeArrObj.centre.lng} ${communeArrObj.centre.lat})` : null,
        prix: parseInt(prix, 10),
        duree: duree ? parseInt(duree, 10) : null,
        horaire_debut: horaireDebut || '05:00',
        horaire_fin: horaireFin || '22:00',
        confiance: 1,
        source: 'communaute',
        contributeur_id: user.id,
      };

      const { data: nouvelleLigne, error } = await supabase
        .from('lignes')
        .insert(donnees)
        .select()
        .single();

      if (error) throw error;

      if (photo && nouvelleLigne) {
        try {
          const photoUrl = await uploaderPhoto(photo, nouvelleLigne.id);
          await supabase.from('lignes').update({ photo_url: photoUrl }).eq('id', nouvelleLigne.id);
        } catch {
          // photo upload non bloquant
        }
      }

      setToast({ message: fr.contribution.succes, type: 'succes' });
      setTimeout(() => navigate('/explorer'), 1500);
    } catch {
      setToast({ message: fr.erreurs.serveur, type: 'erreur' });
    } finally {
      setEnvoi(false);
    }
  }, [type, communeDep, quartierDep, gareDep, reperes, nomLigne, communeArr, prix, duree, horaireDebut, horaireFin, photo, navigate]);

  const nomCommune = (id) => COMMUNES.find((c) => c.id === id)?.nom || id;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header titre={ligneIdEdit ? 'Corriger une ligne' : fr.contribution.titre} retour />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                s <= etape ? 'bg-kotrou-orange text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {s < etape ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${s < etape ? 'bg-kotrou-orange' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {etape === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-kotrou-gris mb-2">Type de transport *</p>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-3 rounded-xl border-2 transition-colors min-h-[48px] ${
                      type === t ? 'border-kotrou-orange bg-kotrou-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-center">
                      <BadgeTransport type={t} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <ListeDeroulante
              label={fr.contribution.commune_dep + ' *'}
              placeholder="Choisir"
              options={COMMUNES_OPTIONS}
              valeur={communeDep}
              onChange={(v) => { setCommuneDep(v); setQuartierDep(''); }}
              erreur={erreurs.communeDep}
            />
            {communeDep && (
              <ListeDeroulante
                label={fr.contribution.quartier_dep + ' *'}
                placeholder="Choisir"
                options={quartiersOptions(communeDep)}
                valeur={quartierDep}
                onChange={setQuartierDep}
                erreur={erreurs.quartierDep}
              />
            )}
            <ChampTexte
              label={fr.contribution.gare_dep + ' *'}
              placeholder="Ex : Pharmacie Sainte-Marie"
              aide="Comment s'appelle cet arrêt ?"
              valeur={gareDep}
              onChange={setGareDep}
              erreur={erreurs.gareDep}
              obligatoire
            />
            <ChampTexte
              label={fr.contribution.reperes}
              placeholder="Ex : au feu de Kouté, devant la pharmacie"
              aide="Comment reconnaître cet arrêt ?"
              valeur={reperes}
              onChange={setReperes}
            />

            <Bouton fullWidth onClick={suivant} icone={<ChevronRight className="w-4 h-4" />}>
              Suivant
            </Bouton>
          </div>
        )}

        {etape === 2 && (
          <div className="space-y-4">
            <ChampTexte
              label={fr.contribution.nom_ligne + ' *'}
              placeholder="Ex : Siporex, Adjamé-Liberté"
              aide="Ce que crie le coxeur"
              valeur={nomLigne}
              onChange={setNomLigne}
              erreur={erreurs.nomLigne}
              obligatoire
            />
            <ListeDeroulante
              label={fr.contribution.destination + ' *'}
              placeholder="Choisir"
              options={COMMUNES_OPTIONS}
              valeur={communeArr}
              onChange={setCommuneArr}
              erreur={erreurs.communeArr}
            />
            <ChampTexte
              label={fr.contribution.prix + ' *'}
              placeholder="200"
              type="number"
              aide="Le prix habituel (entre 50 et 2000 FCFA)"
              valeur={prix}
              onChange={setPrix}
              erreur={erreurs.prix}
              obligatoire
            />
            <ChampTexte
              label="Durée estimée (min)"
              placeholder="20"
              type="number"
              valeur={duree}
              onChange={setDuree}
            />
            <div className="grid grid-cols-2 gap-3">
              <ChampTexte label="Début" type="time" valeur={horaireDebut} onChange={setHoraireDebut} />
              <ChampTexte label="Fin" type="time" valeur={horaireFin} onChange={setHoraireFin} />
            </div>

            <div className="flex gap-3">
              <Bouton variante="ghost" onClick={precedent} icone={<ChevronLeft className="w-4 h-4" />}>
                Précédent
              </Bouton>
              <Bouton fullWidth onClick={suivant} icone={<ChevronRight className="w-4 h-4" />}>
                Suivant
              </Bouton>
            </div>
          </div>
        )}

        {etape === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-kotrou-gris mb-2">Photo de la gare (optionnel)</p>
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Aperçu" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => { setPhoto(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 bg-gray-100 rounded-xl border border-dashed border-gray-300 cursor-pointer active:bg-gray-200">
                  <Camera className="w-8 h-8 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-2">Prendre ou choisir une photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                </label>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Récapitulatif</p>
              <div className="space-y-1.5 text-sm text-kotrou-gris">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <BadgeTransport type={type} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ligne</span>
                  <span className="font-medium">{nomLigne || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Départ</span>
                  <span className="font-medium text-right">{gareDep}, {nomCommune(communeDep)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Arrivée</span>
                  <span className="font-medium">{nomCommune(communeArr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prix</span>
                  <span className="font-bold text-kotrou-orange">{prix} {fr.itineraire.fcfa}</span>
                </div>
                {duree && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Durée</span>
                    <span className="font-medium">{duree} min</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Horaires</span>
                  <span className="font-medium">{horaireDebut} – {horaireFin}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Bouton variante="ghost" onClick={precedent} icone={<ChevronLeft className="w-4 h-4" />}>
                Précédent
              </Bouton>
              <Bouton fullWidth onClick={soumettre} chargement={envoi} icone={<Check className="w-4 h-4" />}>
                {fr.contribution.soumettre}
              </Bouton>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
