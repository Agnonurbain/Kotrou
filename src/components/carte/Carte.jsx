import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

const ABIDJAN = { lat: 5.3196, lng: -4.0167 };
const ZOOM_INITIAL = 13;
const ZOOM_MIN = 10;
const ZOOM_MAX = 18;

let protocolAdded = false;

const COULEURS_TRANSPORT = {
  gbaka: '#F97316',
  woro: '#3B82F6',
  sotra: '#8B5CF6',
  marche: '#6B7280',
};

const COULEURS_SIGNAL = {
  embouteillage: '#DC2626',
  accident: '#FBBF24',
  danger: '#F97316',
  fermeture: '#6B7280',
};

function buildStyle(tilesUrl) {
  const isPmtiles = tilesUrl.endsWith('.pmtiles');
  const sourceUrl = isPmtiles ? `pmtiles://${tilesUrl}` : tilesUrl;

  return {
    version: 8,
    sources: {
      protomaps: {
        type: 'vector',
        ...(isPmtiles ? { url: sourceUrl } : { tiles: [sourceUrl], maxzoom: 15 }),
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f5f5f5' } },
      { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#c4dff6' } },
      { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#e8f0e4' }, filter: ['in', 'pmap:kind', 'park', 'garden', 'forest'] },
      { id: 'roads-minor', type: 'line', source: 'protomaps', 'source-layer': 'roads', paint: { 'line-color': '#e0e0e0', 'line-width': 1 }, filter: ['in', 'pmap:kind', 'minor_road', 'other'] },
      { id: 'roads-major', type: 'line', source: 'protomaps', 'source-layer': 'roads', paint: { 'line-color': '#ffffff', 'line-width': 2.5 }, filter: ['in', 'pmap:kind', 'major_road', 'medium_road'] },
      { id: 'roads-highway', type: 'line', source: 'protomaps', 'source-layer': 'roads', paint: { 'line-color': '#ffd080', 'line-width': 3 }, filter: ['==', 'pmap:kind', 'highway'] },
      { id: 'buildings', type: 'fill', source: 'protomaps', 'source-layer': 'buildings', paint: { 'fill-color': '#e0dcd8', 'fill-opacity': 0.6 }, minzoom: 14 },
      { id: 'roads-labels', type: 'symbol', source: 'protomaps', 'source-layer': 'roads', layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'symbol-placement': 'line' }, paint: { 'text-color': '#999', 'text-halo-color': '#fff', 'text-halo-width': 1.5 }, minzoom: 15 },
      { id: 'places', type: 'symbol', source: 'protomaps', 'source-layer': 'places', layout: { 'text-field': ['get', 'name'], 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 12, 15, 16] }, paint: { 'text-color': '#666', 'text-halo-color': '#fff', 'text-halo-width': 1.5 }, minzoom: 11 },
    ],
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  };
}

function parseCoords(c) {
  if (!c) return null;
  if (c.lat != null) return c;
  if (c.coordinates) return { lng: c.coordinates[0], lat: c.coordinates[1] };
  return null;
}

export default function Carte({
  centre,
  zoom,
  marqueurs = [],
  signalements = [],
  itineraire,
  onCarteClick,
  onMarqueurClick,
  className = '',
}) {
  const conteneurRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [carteChargee, setCarteChargee] = useState(false);

  useEffect(() => {
    if (!conteneurRef.current) return;

    if (!protocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      protocolAdded = true;
    }

    const tilesUrl = import.meta.env.VITE_MAPTILES_URL || '';
    const c = centre || ABIDJAN;

    const map = new maplibregl.Map({
      container: conteneurRef.current,
      style: buildStyle(tilesUrl),
      center: [c.lng, c.lat],
      zoom: zoom || ZOOM_INITIAL,
      minZoom: ZOOM_MIN,
      maxZoom: ZOOM_MAX,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      setCarteChargee(true);
    });

    if (onCarteClick) {
      map.on('click', (e) => {
        onCarteClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setCarteChargee(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !centre) return;
    mapRef.current.flyTo({ center: [centre.lng, centre.lat], zoom: zoom || ZOOM_INITIAL, duration: 800 });
  }, [centre?.lat, centre?.lng, zoom]);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!mapRef.current || !carteChargee) return;

    marqueurs.forEach((gare) => {
      const coords = parseCoords(gare.coords || gare.depart_coords);
      if (!coords) return;

      const couleur = COULEURS_TRANSPORT[gare.type] || '#F97316';
      const taille = Math.max(8, Math.min(16, (gare.confiance || 1) * 3));

      const el = document.createElement('div');
      el.style.cssText = `width:${taille}px;height:${taille}px;background:${couleur};border-radius:50%;border:2px solid white;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.3);`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
          `<div style="font-size:13px;font-weight:600">${gare.nom || gare.depart_gare || ''}</div>
           <div style="font-size:11px;color:#666">${gare.type || ''}</div>`
        ))
        .addTo(mapRef.current);

      if (onMarqueurClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onMarqueurClick(gare);
        });
      }

      markersRef.current.push(marker);
    });
  }, [marqueurs, carteChargee]);

  useEffect(() => {
    if (!mapRef.current || !carteChargee) return;

    markersRef.current
      .filter((m) => m._signalement)
      .forEach((m) => m.remove());

    signalements.forEach((sig) => {
      const coords = parseCoords(sig.coords);
      if (!coords) return;

      const couleur = COULEURS_SIGNAL[sig.type] || '#DC2626';
      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;background:${couleur};border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${couleur}80;`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
          `<div style="font-size:12px;font-weight:600">${sig.type}</div>
           <div style="font-size:11px;color:#666">${sig.description || ''}</div>`
        ))
        .addTo(mapRef.current);

      marker._signalement = true;
      markersRef.current.push(marker);
    });
  }, [signalements, carteChargee]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !carteChargee) return;

    if (map.getLayer('itineraire-marche')) map.removeLayer('itineraire-marche');
    if (map.getLayer('itineraire-transport')) map.removeLayer('itineraire-transport');
    if (map.getSource('itineraire')) map.removeSource('itineraire');

    if (!itineraire?.etapes?.length) return;

    const segments = [];
    const bounds = new maplibregl.LngLatBounds();

    for (const etape of itineraire.etapes) {
      const ligne = etape.ligne;
      if (!ligne) continue;
      const dep = parseCoords(ligne.depart_coords);
      const arr = parseCoords(ligne.arrivee_coords);
      if (!dep || !arr) continue;
      segments.push({
        type: 'Feature',
        properties: { mode: etape.type },
        geometry: { type: 'LineString', coordinates: [[dep.lng, dep.lat], [arr.lng, arr.lat]] },
      });
      bounds.extend([dep.lng, dep.lat]);
      bounds.extend([arr.lng, arr.lat]);
    }

    if (!segments.length) return;

    map.addSource('itineraire', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: segments },
    });

    map.addLayer({
      id: 'itineraire-marche',
      type: 'line',
      source: 'itineraire',
      filter: ['==', ['get', 'mode'], 'marche'],
      paint: { 'line-color': '#6B7280', 'line-width': 3, 'line-dasharray': [3, 3] },
    });

    map.addLayer({
      id: 'itineraire-transport',
      type: 'line',
      source: 'itineraire',
      filter: ['!=', ['get', 'mode'], 'marche'],
      paint: {
        'line-color': ['match', ['get', 'mode'], 'gbaka', '#F97316', 'woro', '#3B82F6', 'sotra', '#8B5CF6', '#F97316'],
        'line-width': 4,
      },
    });

    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
  }, [itineraire, carteChargee]);

  return (
    <div ref={conteneurRef} className={`w-full h-full ${className}`} />
  );
}
