import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculerItineraires } from '../lib/routeur';
import { SEED_LIGNES } from '../data/seed-lignes';

vi.mock('../lib/db-locale', () => ({
  getToutesLignesLocales: vi.fn(() => Promise.resolve(
    SEED_LIGNES.map((l, i) => ({ ...l, id: `seed-${i}`, confiance: l.confiance ?? 1 }))
  )),
}));

const seedAvecIds = SEED_LIGNES.map((l, i) => ({ ...l, id: `seed-${i}`, confiance: l.confiance ?? 1 }));

describe('calculerItineraires (hors-ligne avec seed)', () => {
  it('retourne marche directe si départ ≈ arrivée', async () => {
    const point = { lat: 5.3580, lng: -4.0190 };
    const resultats = await calculerItineraires(point, { lat: 5.3581, lng: -4.0191 }, {}, { modeHorsLigne: true });
    expect(resultats).toHaveLength(1);
    expect(resultats[0].etapes[0].type).toBe('marche');
    expect(resultats[0].prixTotal).toBe(0);
  });

  it('trouve un trajet direct Adjamé → Abobo', async () => {
    const depart = { lat: 5.3610, lng: -4.0180 };
    const arrivee = { lat: 5.4200, lng: -4.0150 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    expect(resultats.length).toBeGreaterThan(0);
    const direct = resultats.find((r) => r.direct);
    expect(direct).toBeDefined();
    expect(direct.prixTotal).toBeGreaterThan(0);
  });

  it('trouve un trajet direct Koumassi → Marcory', async () => {
    const depart = { lat: 5.2960, lng: -3.9990 };
    const arrivee = { lat: 5.3040, lng: -4.0100 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    expect(resultats.length).toBeGreaterThan(0);
  });

  it('propose des correspondances Yopougon → Cocody', async () => {
    const depart = { lat: 5.3480, lng: -4.0610 };
    const arrivee = { lat: 5.3680, lng: -3.9770 };
    const resultats = await calculerItineraires(depart, arrivee, { maxResultats: 10 }, { modeHorsLigne: true });
    const avecCorresp = resultats.filter((r) => !r.direct);
    expect(avecCorresp.length).toBeGreaterThan(0);
    const premier = avecCorresp[0];
    expect(premier.etapes.length).toBeGreaterThanOrEqual(5);
    expect(premier.etapes.some((e) => e.description?.includes('Correspondance'))).toBe(true);
  });

  it('retourne un tableau vide si aucun résultat', async () => {
    const depart = { lat: 6.0, lng: -5.0 };
    const arrivee = { lat: 6.1, lng: -5.1 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    expect(resultats).toEqual([]);
  });

  it('trie les résultats par score décroissant', async () => {
    const depart = { lat: 5.3580, lng: -4.0190 };
    const arrivee = { lat: 5.3196, lng: -4.0167 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    if (resultats.length > 1) {
      for (let i = 1; i < resultats.length; i++) {
        expect(resultats[i - 1].score).toBeGreaterThanOrEqual(resultats[i].score);
      }
    }
  });

  it('respecte maxResultats', async () => {
    const depart = { lat: 5.3580, lng: -4.0190 };
    const arrivee = { lat: 5.3196, lng: -4.0167 };
    const resultats = await calculerItineraires(depart, arrivee, { maxResultats: 2 }, { modeHorsLigne: true });
    expect(resultats.length).toBeLessThanOrEqual(2);
  });
});
