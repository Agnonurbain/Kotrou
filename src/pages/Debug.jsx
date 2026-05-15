import { useState } from 'react';
import { Share2, Filter } from 'lucide-react';
import { fr } from '../i18n/fr';

import Header from '../components/layout/Header';
import Bouton from '../components/ui/Bouton';
import Badge from '../components/ui/Badge';
import Chargement from '../components/ui/Chargement';
import EtatVide from '../components/ui/EtatVide';
import ChampTexte from '../components/ui/ChampTexte';
import ListeDeroulante from '../components/ui/ListeDeroulante';
import Toast from '../components/ui/Toast';
import BadgeTransport from '../components/itineraire/BadgeTransport';
import CarteEtape from '../components/itineraire/CarteEtape';
import PrixTotal from '../components/itineraire/PrixTotal';
import BoutonSignalement from '../components/signalement/BoutonSignalement';

function Section({ titre, children }) {
  return (
    <div className="border-b border-gray-100 pb-6 mb-6">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{titre}</h2>
      {children}
    </div>
  );
}

const ETAPES_DEMO = [
  { type: 'marche', dureeMinutes: 3, prix: 0, description: "Marcher jusqu'à Gare d'Adjamé" },
  { type: 'gbaka', dureeMinutes: 25, prix: 200, description: "Prendre Gbaka Adjamé-Yopougon Siporex depuis Gare d'Adjamé", ligne: { nom_ligne: 'Gbaka Siporex' } },
  { type: 'marche', dureeMinutes: 10, prix: 0, description: "Correspondance à Gare d'Adjamé" },
  { type: 'sotra', dureeMinutes: 35, prix: 300, description: 'Prendre SOTRA Ligne 46 depuis Angré Terminus', ligne: { nom_ligne: 'SOTRA Ligne 46' } },
  { type: 'marche', dureeMinutes: 5, prix: 0, description: "Marcher jusqu'à destination" },
];

export default function Debug() {
  const [texte, setTexte] = useState('');
  const [select, setSelect] = useState('');
  const [toast, setToast] = useState(null);
  const [chargement, setChargement] = useState(false);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header titre="Debug — Design System" action={{ icone: <Filter className="w-5 h-5" />, onClick: () => {} }} />

      <div className="p-4 pb-24">

        <Section titre="Boutons">
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Bouton variante="primaire">Primaire</Bouton>
              <Bouton variante="secondaire">Secondaire</Bouton>
              <Bouton variante="danger">Danger</Bouton>
              <Bouton variante="ghost">Ghost</Bouton>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Bouton taille="sm">Petit</Bouton>
              <Bouton taille="md">Moyen</Bouton>
              <Bouton taille="lg">Grand</Bouton>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Bouton chargement>Chargement</Bouton>
              <Bouton disabled>Désactivé</Bouton>
            </div>
            <Bouton fullWidth variante="primaire">Pleine largeur</Bouton>
          </div>
        </Section>

        <Section titre="Badges transport">
          <div className="flex gap-2 flex-wrap">
            <BadgeTransport type="gbaka" nomLigne="Gbaka Siporex" />
            <BadgeTransport type="woro" nomLigne="Wôrô Koumassi" />
            <BadgeTransport type="sotra" nomLigne="SOTRA 46" />
            <BadgeTransport type="marche" />
          </div>
        </Section>

        <Section titre="Badges génériques">
          <div className="flex gap-2 flex-wrap">
            <Badge type="gbaka" />
            <Badge type="woro" />
            <Badge type="sotra" />
            <Badge type="confiance" valeur="5" />
            <Badge type="confiance" valeur="3" />
            <Badge type="confiance" valeur="0" />
            <Badge type="badge" valeur="Expert quartier" />
          </div>
        </Section>

        <Section titre="Formulaires">
          <div className="space-y-4">
            <ChampTexte
              label={fr.contribution.nom_ligne}
              placeholder="Ex: Gbaka Siporex"
              valeur={texte}
              onChange={setTexte}
              obligatoire
            />
            <ChampTexte
              label="Avec erreur"
              placeholder="Saisir quelque chose"
              valeur=""
              onChange={() => {}}
              erreur={fr.erreurs.champ_requis}
            />
            <ChampTexte
              label="Avec aide"
              placeholder="500"
              aide={fr.erreurs.prix_invalide}
              valeur=""
              onChange={() => {}}
              type="number"
            />
            <ListeDeroulante
              label={fr.contribution.commune_dep}
              placeholder="Choisir une commune"
              valeur={select}
              onChange={setSelect}
              options={[
                { valeur: 'adjame', libelle: 'Adjamé' },
                { valeur: 'cocody', libelle: 'Cocody' },
                { valeur: 'yopougon', libelle: 'Yopougon' },
              ]}
            />
          </div>
        </Section>

        <Section titre="Itinéraire — Étapes">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            {ETAPES_DEMO.map((etape, i) => (
              <CarteEtape
                key={i}
                etape={etape}
                index={i}
                estDerniere={i === ETAPES_DEMO.length - 1}
              />
            ))}
          </div>
        </Section>

        <Section titre="Prix total">
          <div className="space-y-3">
            <PrixTotal prix={500} duree={78} nbCorrespondances={1} />
            <PrixTotal prix={0} duree={15} nbCorrespondances={0} />
          </div>
        </Section>

        <Section titre="Skeletons (chargement)">
          <div className="space-y-4">
            <p className="text-xs text-gray-400">Itinéraire :</p>
            <Chargement type="itineraire" />
            <p className="text-xs text-gray-400">Ligne (x3) :</p>
            <Chargement type="ligne" nb={3} />
            <p className="text-xs text-gray-400">Profil :</p>
            <Chargement type="profil" />
          </div>
        </Section>

        <Section titre="États vides">
          <div className="space-y-4">
            <EtatVide type="itineraire" />
            <EtatVide type="lignes" onAction={() => setToast({ message: 'Action CTA cliquée', type: 'info' })} />
            <EtatVide type="signalements" />
          </div>
        </Section>

        <Section titre="Toasts">
          <div className="flex gap-2 flex-wrap">
            <Bouton taille="sm" variante="primaire" onClick={() => setToast({ message: fr.signalement.merci, type: 'succes' })}>
              Succès
            </Bouton>
            <Bouton taille="sm" variante="danger" onClick={() => setToast({ message: fr.erreurs.serveur, type: 'erreur' })}>
              Erreur
            </Bouton>
            <Bouton taille="sm" variante="ghost" onClick={() => setToast({ message: fr.etats.hors_ligne, type: 'info' })}>
              Info
            </Bouton>
          </div>
        </Section>

      </div>

      <BoutonSignalement onSignaler={(type) => setToast({ message: `Signalement : ${type}`, type: 'succes' })} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
