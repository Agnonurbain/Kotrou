import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Camera, X, Plus, Bus, Footprints } from 'lucide-react';
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

function creerSegment(communeDep = '', quartierDep = '') {
  return {
    type: 'woro',
    communeDep,
    quartierDep,
    gareDep: '',
    reperes: '',
    nomLigne: '',
    communeArr: '',
    prix: '',
    duree: '',
    horaireDebut: '05:00',
    horaireFin: '22:00',
  };
}

export default function Contribution() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ligneIdEdit = params.get('ligne_id');
  const communeInit = params.get('commune') || '';
  const quartierInit = params.get('quartier') || '';

  const [segments, setSegments] = useState([creerSegment(communeInit, quartierInit)]);
  const [indexActif, setIndexActif] = useState(0);
  const [etape, setEtape] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState(null);
  const [erreurs, setErreurs] = useState({});

  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const seg = segments[indexActif];

  const majSegment = (champ, valeur) => {
    setSegments((prev) => prev.map((s, i) =>
      i === indexActif ? { ...s, [champ]: valeur } : s
    ));
  };

  useEffect(() => {
    if (!ligneIdEdit) return;
    supabase.from('lignes').select('*').eq('id', ligneIdEdit).single().then(({ data }) => {
      if (!data) return;
      setSegments([{
        type: data.type || 'gbaka',
        communeDep: data.depart_commune || '',
        quartierDep: data.depart_quartier || '',
        gareDep: data.depart_gare || '',
        reperes: data.depart_reperes || '',
        nomLigne: data.nom_ligne || '',
        communeArr: data.arrivee_commune || '',
        prix: data.prix ? String(data.prix) : '',
        duree: data.duree ? String(data.duree) : '',
        horaireDebut: data.horaire_debut?.slice(0, 5) || '05:00',
        horaireFin: data.horaire_fin?.slice(0, 5) || '22:00',
      }]);
    });
  }, [ligneIdEdit]);

  const validerEtape1 = () => {
    const e = {};
    if (!seg.communeDep) e.communeDep = fr.erreurs.champ_requis;
    if (!seg.quartierDep) e.quartierDep = fr.erreurs.champ_requis;
    if (!seg.gareDep.trim()) e.gareDep = fr.erreurs.champ_requis;
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const validerEtape2 = () => {
    const e = {};
    if (!seg.nomLigne.trim()) e.nomLigne = fr.erreurs.champ_requis;
    if (!seg.communeArr) e.communeArr = fr.erreurs.champ_requis;
    const p = parseInt(seg.prix, 10);
    if (!seg.prix || isNaN(p) || p < 50 || p > 2000) e.prix = fr.erreurs.prix_invalide;
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const suivant = () => {
    if (etape === 1 && validerEtape1()) setEtape(2);
    else if (etape === 2 && validerEtape2()) setEtape(3);
  };

  const precedent = () => {
    setErreurs({});
    if (etape === 1 && indexActif > 0) {
      setSegments((prev) => prev.slice(0, -1));
      setIndexActif(indexActif - 1);
      setEtape(3);
    } else {
      setEtape((e) => Math.max(1, e - 1));
    }
  };

  const ajouterCorrespondance = () => {
    const nouveau = creerSegment(seg.communeArr, '');
    setSegments((prev) => [...prev, nouveau]);
    setIndexActif(segments.length);
    setErreurs({});
    setEtape(1);
  };

  const supprimerSegment = (index) => {
    if (segments.length <= 1) return;
    const next = segments.filter((_, i) => i !== index);
    setSegments(next);
    setIndexActif(0);
    setEtape(3);
  };

  const modifierSegment = (index) => {
    setIndexActif(index);
    setEtape(1);
    setErreurs({});
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
      const lignesAInserer = segments.map((s) => {
        const communeDepObj = COMMUNES.find((c) => c.id === s.communeDep);
        const communeArrObj = COMMUNES.find((c) => c.id === s.communeArr);
        return {
          nom_ligne: s.nomLigne.trim(),
          type: s.type,
          depart_commune: s.communeDep,
          depart_quartier: s.quartierDep,
          depart_gare: s.gareDep.trim(),
          depart_reperes: s.reperes.trim() || null,
          depart_coords: communeDepObj ? `POINT(${communeDepObj.centre.lng} ${communeDepObj.centre.lat})` : null,
          arrivee_commune: s.communeArr,
          arrivee_coords: communeArrObj ? `POINT(${communeArrObj.centre.lng} ${communeArrObj.centre.lat})` : null,
          prix: parseInt(s.prix, 10),
          duree: s.duree ? parseInt(s.duree, 10) : null,
          horaire_debut: s.horaireDebut || '05:00',
          horaire_fin: s.horaireFin || '22:00',
          confiance: 1,
          source: 'communaute',
          contributeur_id: user.id,
        };
      });

      const { data: nouvelles, error } = await supabase
        .from('lignes')
        .insert(lignesAInserer)
        .select();

      if (error) throw error;

      if (photo && nouvelles?.[0]) {
        try {
          const photoUrl = await uploaderPhoto(photo, nouvelles[0].id);
          await supabase.from('lignes').update({ photo_url: photoUrl }).eq('id', nouvelles[0].id);
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
  }, [segments, photo, navigate]);

  const nomCommune = (id) => COMMUNES.find((c) => c.id === id)?.nom || id;

  const estRecap = etape === 3;
  const nbSegments = segments.length;
  const titreHeader = ligneIdEdit
    ? 'Corriger une ligne'
    : estRecap
      ? fr.contribution.titre
      : nbSegments > 1
        ? `Segment ${indexActif + 1}/${nbSegments}`
        : fr.contribution.titre;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-kotrou-fond pb-20">
      <Header titre={titreHeader} retour={ligneIdEdit ? true : false} />

      <div className="px-4 pt-4">
        {!estRecap && (
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1 gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  s <= etape ? 'bg-kotrou-orange text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {s < etape ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 2 && <div className={`flex-1 h-0.5 ${s < etape ? 'bg-kotrou-orange' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {etape === 1 && (
          <div className="space-y-4">
            {indexActif > 0 && (
              <div className="bg-kotrou-50 border border-kotrou-200 rounded-xl p-3 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-kotrou-orange shrink-0" />
                <p className="text-xs text-kotrou-gris">
                  Correspondance depuis <span className="font-semibold">{nomCommune(seg.communeDep)}</span>
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-kotrou-gris mb-2">Type de transport *</p>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => majSegment('type', t)}
                    className={`flex-1 py-3 rounded-xl border-2 transition-colors min-h-[48px] ${
                      seg.type === t ? 'border-kotrou-orange bg-kotrou-50' : 'border-gray-200 bg-white'
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
              valeur={seg.communeDep}
              onChange={(v) => { majSegment('communeDep', v); majSegment('quartierDep', ''); }}
              erreur={erreurs.communeDep}
            />
            {seg.communeDep && (
              <ListeDeroulante
                label={fr.contribution.quartier_dep + ' *'}
                placeholder="Choisir"
                options={quartiersOptions(seg.communeDep)}
                valeur={seg.quartierDep}
                onChange={(v) => majSegment('quartierDep', v)}
                erreur={erreurs.quartierDep}
              />
            )}
            <ChampTexte
              label={fr.contribution.gare_dep + ' *'}
              placeholder="Ex : Pharmacie Sainte-Marie"
              aide="Comment s'appelle cet arrêt ?"
              valeur={seg.gareDep}
              onChange={(v) => majSegment('gareDep', v)}
              erreur={erreurs.gareDep}
              obligatoire
            />
            <ChampTexte
              label={fr.contribution.reperes}
              placeholder="Ex : au feu de Kouté, devant la pharmacie"
              aide="Comment reconnaître cet arrêt ?"
              valeur={seg.reperes}
              onChange={(v) => majSegment('reperes', v)}
            />

            <div className="flex gap-3">
              {indexActif > 0 && (
                <Bouton variante="ghost" onClick={precedent} icone={<ChevronLeft className="w-4 h-4" />}>
                  Précédent
                </Bouton>
              )}
              <Bouton fullWidth onClick={suivant} icone={<ChevronRight className="w-4 h-4" />}>
                Suivant
              </Bouton>
            </div>
          </div>
        )}

        {etape === 2 && (
          <div className="space-y-4">
            <ChampTexte
              label={fr.contribution.nom_ligne + ' *'}
              placeholder="Ex : Siporex, Adjamé-Liberté"
              aide="Ce que crie le coxeur"
              valeur={seg.nomLigne}
              onChange={(v) => majSegment('nomLigne', v)}
              erreur={erreurs.nomLigne}
              obligatoire
            />
            <ListeDeroulante
              label={fr.contribution.destination + ' *'}
              placeholder="Choisir"
              options={COMMUNES_OPTIONS}
              valeur={seg.communeArr}
              onChange={(v) => majSegment('communeArr', v)}
              erreur={erreurs.communeArr}
            />
            <ChampTexte
              label={fr.contribution.prix + ' *'}
              placeholder="200"
              type="number"
              aide="Le prix habituel (entre 50 et 2000 FCFA)"
              valeur={seg.prix}
              onChange={(v) => majSegment('prix', v)}
              erreur={erreurs.prix}
              obligatoire
            />
            <ChampTexte
              label="Durée estimée (min)"
              placeholder="20"
              type="number"
              valeur={seg.duree}
              onChange={(v) => majSegment('duree', v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <ChampTexte label="Début" type="time" valeur={seg.horaireDebut} onChange={(v) => majSegment('horaireDebut', v)} />
              <ChampTexte label="Fin" type="time" valeur={seg.horaireFin} onChange={(v) => majSegment('horaireFin', v)} />
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

        {estRecap && (
          <div className="space-y-4">
            {segments.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-kotrou-orange text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <BadgeTransport type={s.type} />
                    <span className="text-sm font-semibold text-kotrou-gris">{s.nomLigne || '—'}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => modifierSegment(i)}
                      className="text-xs text-kotrou-orange font-medium px-2 py-1 rounded-lg active:bg-kotrou-50"
                    >
                      Modifier
                    </button>
                    {segments.length > 1 && (
                      <button
                        onClick={() => supprimerSegment(i)}
                        className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg active:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-kotrou-gris">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Départ</span>
                    <span className="font-medium text-right">{s.gareDep}, {nomCommune(s.communeDep)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Arrivée</span>
                    <span className="font-medium">{nomCommune(s.communeArr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prix</span>
                    <span className="font-bold text-kotrou-orange">{s.prix} {fr.itineraire.fcfa}</span>
                  </div>
                  {s.duree && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Durée</span>
                      <span className="font-medium">{s.duree} min</span>
                    </div>
                  )}
                </div>

                {i < segments.length - 1 && (
                  <div className="flex items-center gap-2 pt-2 text-gray-400">
                    <Footprints className="w-3.5 h-3.5" />
                    <span className="text-xs">Correspondance à {nomCommune(s.communeArr)}</span>
                  </div>
                )}
              </div>
            ))}

            {segments.length > 1 && (
              <div className="bg-kotrou-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-kotrou-gris font-medium">Prix total</span>
                <span className="text-lg font-bold text-kotrou-orange">
                  {segments.reduce((sum, s) => sum + (parseInt(s.prix, 10) || 0), 0)} {fr.itineraire.fcfa}
                </span>
              </div>
            )}

            <Bouton
              variante="secondaire"
              fullWidth
              icone={<Plus className="w-4 h-4" />}
              onClick={ajouterCorrespondance}
            >
              Ajouter une correspondance
            </Bouton>

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

            <div className="flex gap-3">
              <Bouton variante="ghost" onClick={() => { setEtape(2); setIndexActif(segments.length - 1); }} icone={<ChevronLeft className="w-4 h-4" />}>
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
