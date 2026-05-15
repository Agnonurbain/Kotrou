const COULEURS = {
  gbaka: '#F97316',
  woro: '#3B82F6',
  sotra: '#8B5CF6',
  marche: '#6B7280',
};

function parseCoords(c) {
  if (!c) return null;
  if (c.lat != null) return [c.lng, c.lat];
  if (c.coordinates) return [c.coordinates[0], c.coordinates[1]];
  return null;
}

export function construireGeoJSON(itineraire) {
  const features = [];
  const points = [];

  if (!itineraire?.etapes) return { features: [], points: [] };

  for (const etape of itineraire.etapes) {
    if (!etape.ligne) continue;

    const dep = parseCoords(etape.ligne.depart_coords);
    const arr = parseCoords(etape.ligne.arrivee_coords);
    if (!dep || !arr) continue;

    features.push({
      type: 'Feature',
      properties: { mode: etape.type, couleur: COULEURS[etape.type] || COULEURS.marche },
      geometry: { type: 'LineString', coordinates: [dep, arr] },
    });

    points.push(dep, arr);
  }

  return { features, points };
}

export function calculerBounds(points) {
  if (!points.length) return null;

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}
