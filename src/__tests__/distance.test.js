import { describe, it, expect } from 'vitest';
import { haversine, tempsMarche } from '../lib/distance';

describe('haversine', () => {
  it('retourne 0 pour le même point', () => {
    const p = { lat: 5.3580, lng: -4.0190 };
    expect(haversine(p, p)).toBe(0);
  });

  it('calcule la distance Adjamé → Plateau (~4.5 km)', () => {
    const adjame = { lat: 5.3580, lng: -4.0190 };
    const plateau = { lat: 5.3196, lng: -4.0167 };
    const dist = haversine(adjame, plateau);
    expect(dist).toBeGreaterThan(4000);
    expect(dist).toBeLessThan(5000);
  });

  it('calcule la distance Abobo → Treichville (~14 km)', () => {
    const abobo = { lat: 5.4200, lng: -4.0150 };
    const treichville = { lat: 5.2950, lng: -4.0120 };
    const dist = haversine(abobo, treichville);
    expect(dist).toBeGreaterThan(13000);
    expect(dist).toBeLessThan(15000);
  });
});

describe('tempsMarche', () => {
  it('retourne 1 min pour 80m ou moins', () => {
    expect(tempsMarche(80)).toBe(1);
    expect(tempsMarche(50)).toBe(1);
  });

  it('retourne 5 min pour 400m', () => {
    expect(tempsMarche(400)).toBe(5);
  });

  it('arrondit au supérieur', () => {
    expect(tempsMarche(100)).toBe(2);
  });
});
