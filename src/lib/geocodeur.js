import { openDB } from 'idb';

const NOMINATIM_URL = import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const CACHE_STORE = 'geocode_cache';
const DB_NAME = 'kotrou_geocode';
const DELAI_MS = 1100;

let dernierAppel = 0;

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE);
      }
    },
  });
}

async function respecterDelai() {
  const maintenant = Date.now();
  const attente = DELAI_MS - (maintenant - dernierAppel);
  if (attente > 0) {
    await new Promise((r) => setTimeout(r, attente));
  }
  dernierAppel = Date.now();
}

export async function geocoder(adresse, commune = '') {
  const requete = commune ? `${adresse}, ${commune}, Abidjan` : `${adresse}, Abidjan, Côte d'Ivoire`;
  const cle = requete.toLowerCase().trim();

  const db = await getDB();
  const cache = await db.get(CACHE_STORE, cle);
  if (cache) return cache;

  await respecterDelai();

  const params = new URLSearchParams({
    q: requete,
    format: 'json',
    limit: '1',
    countrycodes: 'ci',
    viewbox: '-4.2,5.15,-3.8,5.5',
    bounded: '1',
  });

  const res = await fetch(`${NOMINATIM_URL}/search?${params}`, {
    headers: { 'User-Agent': 'Kotrou/1.0' },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  const resultat = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  await db.put(CACHE_STORE, resultat, cle);
  return resultat;
}

export async function reverseGeocode(lat, lng) {
  const cle = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;

  const db = await getDB();
  const cache = await db.get(CACHE_STORE, cle);
  if (cache) return cache;

  await respecterDelai();

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    zoom: '18',
  });

  const res = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
    headers: { 'User-Agent': 'Kotrou/1.0' },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.display_name) return null;

  const resultat = {
    nom: data.display_name,
    quartier: data.address?.suburb || data.address?.neighbourhood || null,
    commune: data.address?.city_district || data.address?.city || null,
  };
  await db.put(CACHE_STORE, resultat, cle);
  return resultat;
}
