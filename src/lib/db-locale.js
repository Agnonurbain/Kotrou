import { openDB } from 'idb';

const DB_NOM = 'kotrou_offline';
const DB_VERSION = 2;
const STORE_LIGNES = 'lignes';
const STORE_META = 'meta';
const STORE_TRAJET = 'trajet_en_cours';

export async function ouvrirDB() {
  return openDB(DB_NOM, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_LIGNES, { keyPath: 'id' });
        store.createIndex('commune', 'depart_commune');
        db.createObjectStore(STORE_META);
      }
      if (oldVersion < 2) {
        db.createObjectStore(STORE_TRAJET, { keyPath: 'id' });
      }
    },
  });
}

export async function sauvegarderCommune(communeId, lignes) {
  const db = await ouvrirDB();
  const tx = db.transaction([STORE_LIGNES, STORE_META], 'readwrite');

  const existantes = await tx.objectStore(STORE_LIGNES).index('commune').getAllKeys(communeId);
  for (const key of existantes) {
    await tx.objectStore(STORE_LIGNES).delete(key);
  }

  for (const ligne of lignes) {
    await tx.objectStore(STORE_LIGNES).put(ligne);
  }

  await tx.objectStore(STORE_META).put({ date: new Date().toISOString(), count: lignes.length }, `commune:${communeId}`);
  await tx.done;
}

export async function getLignesLocales(communeId) {
  const db = await ouvrirDB();
  return db.getAllFromIndex(STORE_LIGNES, 'commune', communeId);
}

export async function supprimerCommune(communeId) {
  const db = await ouvrirDB();
  const tx = db.transaction([STORE_LIGNES, STORE_META], 'readwrite');

  const keys = await tx.objectStore(STORE_LIGNES).index('commune').getAllKeys(communeId);
  for (const key of keys) {
    await tx.objectStore(STORE_LIGNES).delete(key);
  }

  await tx.objectStore(STORE_META).delete(`commune:${communeId}`);
  await tx.done;
}

export async function getCommunesTelecharges() {
  const db = await ouvrirDB();
  const tx = db.transaction(STORE_META, 'readonly');
  const allKeys = await tx.store.getAllKeys();
  const result = [];

  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith('commune:')) {
      const meta = await tx.store.get(key);
      result.push({
        communeId: key.replace('commune:', ''),
        date: meta.date,
        count: meta.count,
      });
    }
  }

  return result;
}

export async function getToutesLignesLocales() {
  const db = await ouvrirDB();
  return db.getAll(STORE_LIGNES);
}
