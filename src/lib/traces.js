function distancePointSegment(point, segA, segB) {
  const dx = segB.lng - segA.lng;
  const dy = segB.lat - segA.lat;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d === 0) {
    return Math.sqrt((point.lng - segA.lng) ** 2 + (point.lat - segA.lat) ** 2) * 111000;
  }

  const dist =
    Math.abs(dy * point.lng - dx * point.lat + segB.lng * segA.lat - segB.lat * segA.lng) / d;
  return dist * 111000;
}

export function simplifierTrace(points, tolerance = 20) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = distancePointSegment(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    const gauche = simplifierTrace(points.slice(0, maxIndex + 1), tolerance);
    const droite = simplifierTrace(points.slice(maxIndex), tolerance);
    return [...gauche.slice(0, -1), ...droite];
  }

  return [points[0], points[points.length - 1]];
}

export function filtrerPoints(points) {
  return points.filter((pt, i) => {
    if (pt.accuracy > 50) return false;
    if (pt.speed !== null && pt.speed < 2 / 3.6) return false;
    if (pt.speed !== null && pt.speed > 120 / 3.6) return false;

    if (i > 0) {
      const prev = points[i - 1];
      const dt = (pt.timestamp - prev.timestamp) / 1000;
      if (dt <= 0) return false;
      const dlat = Math.abs(pt.lat - prev.lat) * 111000;
      const dlng = Math.abs(pt.lng - prev.lng) * 111000 * Math.cos((pt.lat * Math.PI) / 180);
      const dist = Math.sqrt(dlat ** 2 + dlng ** 2);
      const vitesse = dist / dt;
      if (vitesse > 40) return false;
    }

    return true;
  });
}

export function calculerDistanceKm(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const R = 6371;
    const dLat = ((points[i].lat - points[i - 1].lat) * Math.PI) / 180;
    const dLng = ((points[i].lng - points[i - 1].lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((points[i - 1].lat * Math.PI) / 180) *
        Math.cos((points[i].lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total * 100) / 100;
}

export function pointsVersLinestring(points) {
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng} ${p.lat}`).join(', ');
  return `LINESTRING(${coords})`;
}

export function vitesseMoyenne(points) {
  const vitesses = points.map((p) => p.speed).filter((s) => s !== null && s > 0);
  if (vitesses.length === 0) return null;
  const moy = vitesses.reduce((a, b) => a + b, 0) / vitesses.length;
  return Math.round(moy * 3.6 * 10) / 10;
}
