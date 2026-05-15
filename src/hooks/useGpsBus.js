import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  filtrerPoints,
  simplifierTrace,
  calculerDistanceKm,
  pointsVersLinestring,
  vitesseMoyenne,
} from '../lib/traces';
import { ouvrirDB } from '../lib/db-locale';

const PRECISION_MINI_M = 50;
const NB_POINTS_MIN = 8;

export function useGpsBus() {
  const [actif, setActif] = useState(false);
  const [pointsBruts, setPointsBruts] = useState([]);
  const [statut, setStatut] = useState('inactif');
  const [ligneSelectee, setLigneSelectee] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [erreur, setErreur] = useState(null);

  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const dbRef = useRef(null);
  const ligneRef = useRef(null);

  useEffect(() => {
    ligneRef.current = ligneSelectee;
  }, [ligneSelectee]);

  useEffect(() => {
    ouvrirDB().then((db) => {
      dbRef.current = db;
      restaurerTraceEnCours(db);
    });
    return () => arreterGps();
  }, []);

  async function restaurerTraceEnCours(db) {
    try {
      const tx = db.transaction('trajet_en_cours', 'readonly');
      const sauve = await tx.objectStore('trajet_en_cours').get('actuel');
      if (sauve && sauve.actif && sauve.points.length > 0) {
        setPointsBruts(sauve.points);
        setLigneSelectee(sauve.ligne);
        ligneRef.current = sauve.ligne;
        setDistanceKm(calculerDistanceKm(sauve.points));
        setActif(true);
        setStatut('actif');
        demarrerGps();
      }
    } catch {
      // IndexedDB vide ou corrompu — ignorer
    }
  }

  async function persister(points, ligne) {
    if (!dbRef.current) return;
    try {
      const tx = dbRef.current.transaction('trajet_en_cours', 'readwrite');
      await tx.objectStore('trajet_en_cours').put({
        id: 'actuel',
        actif: true,
        points,
        ligne,
        ts: Date.now(),
      });
    } catch {
      // Silently fail — trace will still be in memory
    }
  }

  async function activerWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Non supporté ou refusé
      }
    }
  }

  function relacherWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }

  function demarrerGps() {
    if (!navigator.geolocation) {
      setErreur("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pt = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
        };

        if (pt.accuracy > PRECISION_MINI_M) return;

        setPointsBruts((prev) => {
          const nouveaux = [...prev, pt];
          setDistanceKm(calculerDistanceKm(nouveaux));
          persister(nouveaux, ligneRef.current);
          return nouveaux;
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setErreur('Permission GPS refusée. Active la localisation pour ce mode.');
          setActif(false);
          setStatut('inactif');
          arreterGps();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      },
    );
  }

  function arreterGps() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    relacherWakeLock();
  }

  async function nettoyerIndexedDB() {
    if (!dbRef.current) return;
    try {
      const tx = dbRef.current.transaction('trajet_en_cours', 'readwrite');
      await tx.objectStore('trajet_en_cours').delete('actuel');
    } catch {
      // Ignorer
    }
  }

  const demarrer = useCallback(async (ligne = null) => {
    setPointsBruts([]);
    setDistanceKm(0);
    setErreur(null);
    setLigneSelectee(ligne);
    ligneRef.current = ligne;
    setActif(true);
    setStatut('actif');
    await activerWakeLock();
    demarrerGps();
  }, []);

  const terminer = useCallback(
    async (ligneFinale = null) => {
      arreterGps();
      setActif(false);
      setStatut('upload');

      const ligneAssocie = ligneFinale || ligneRef.current;

      const pointsValides = filtrerPoints(pointsBruts);
      const pct =
        pointsBruts.length > 0
          ? Math.round((pointsValides.length / pointsBruts.length) * 100)
          : 0;

      if (pointsValides.length < NB_POINTS_MIN) {
        setStatut('inactif');
        nettoyerIndexedDB();
        return {
          succes: false,
          raison: `Trace trop courte (${pointsValides.length} points valides, minimum ${NB_POINTS_MIN}).`,
        };
      }

      const pointsSimplifies = simplifierTrace(pointsValides, 25);
      const distKm = calculerDistanceKm(pointsValides);
      const dureeMin =
        pointsBruts.length >= 2
          ? Math.round((pointsBruts.at(-1).timestamp - pointsBruts[0].timestamp) / 60_000)
          : null;
      const vitesseMoy = vitesseMoyenne(pointsValides);
      const precMoy = Math.round(
        pointsValides.reduce((s, p) => s + p.accuracy, 0) / pointsValides.length,
      );

      try {
        const { error } = await supabase.from('traces_gps').insert({
          ligne_id: ligneAssocie?.id ?? null,
          trace: pointsVersLinestring(pointsSimplifies),
          points_bruts: pointsValides,
          nb_points: pointsValides.length,
          distance_km: distKm,
          duree_minutes: dureeMin,
          vitesse_moyenne: vitesseMoy,
          precision_moyenne: precMoy,
          pct_points_valides: pct,
          heure_depart: new Date(pointsBruts[0].timestamp).toISOString(),
          heure_arrivee: new Date(pointsBruts.at(-1).timestamp).toISOString(),
          statut: 'en_attente',
        });

        if (error) throw error;

        if (ligneAssocie?.id) {
          supabase.functions.invoke('ameliorer-coordonnees', {
            body: { ligne_id: ligneAssocie.id },
          });
        }

        setStatut('inactif');
        nettoyerIndexedDB();

        return {
          succes: true,
          nbPointsValides: pointsValides.length,
          nbPointsSimpl: pointsSimplifies.length,
          distanceKm: distKm,
          pctValides: pct,
        };
      } catch (err) {
        setStatut('inactif');
        return { succes: false, raison: err.message };
      }
    },
    [pointsBruts],
  );

  const annuler = useCallback(() => {
    arreterGps();
    setActif(false);
    setStatut('inactif');
    setPointsBruts([]);
    setDistanceKm(0);
    nettoyerIndexedDB();
  }, []);

  return {
    actif,
    statut,
    pointsBruts,
    distanceKm,
    nbPoints: pointsBruts.length,
    ligneSelectee,
    erreur,
    wakeLockActif: !!wakeLockRef.current,
    demarrer,
    terminer,
    annuler,
    setLigneSelectee,
  };
}
