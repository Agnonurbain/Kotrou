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
  it('1. retourne un itineraire direct entre deux points proches d\'une ligne', async () => {
    // Proche de la seed "Gbaka Adjamé-Plateau" (depart 5.3580,-4.0190 → arrivee 5.3196,-4.0167)
    const depart = { lat: 5.3580, lng: -4.0190 };
    const arrivee = { lat: 5.3196, lng: -4.0167 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    expect(resultats.length).toBeGreaterThan(0);
    const direct = resultats.find((r) => r.direct);
    expect(direct).toBeDefined();
    expect(direct.etapes.length).toBeGreaterThanOrEqual(3);
    expect(direct.prixTotal).toBeGreaterThan(0);
    expect(direct.dureeTotal).toBeGreaterThan(0);
  });

  it('2. retourne un itineraire avec correspondance via Adjame', async () => {
    const depart = { lat: 5.3480, lng: -4.0610 };
    const arrivee = { lat: 5.3680, lng: -3.9770 };
    const resultats = await calculerItineraires(depart, arrivee, { maxResultats: 10 }, { modeHorsLigne: true });
    const avecCorresp = resultats.filter((r) => !r.direct);
    expect(avecCorresp.length).toBeGreaterThan(0);
    const premier = avecCorresp[0];
    expect(premier.etapes.length).toBeGreaterThanOrEqual(5);
    expect(premier.etapes.some((e) => e.description?.includes('Correspondance'))).toBe(true);
    expect(premier.direct).toBe(false);
  });

  it('3. retourne [] si aucune ligne a portee', async () => {
    const depart = { lat: 6.0, lng: -5.0 };
    const arrivee = { lat: 6.1, lng: -5.1 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    expect(resultats).toEqual([]);
  });

  it('4. exclut une ligne avec signalement danger actif', async () => {
    const depart = { lat: 5.3580, lng: -4.0190 };
    const arrivee = { lat: 5.3196, lng: -4.0167 };

    const mockSupabase = {
      from: vi.fn((table) => {
        if (table === 'lignes_fiables') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: seedAvecIds, error: null }),
            }),
          };
        }
        if (table === 'signalements') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gt: vi.fn().mockResolvedValue({
                  data: [{
                    coords: { coordinates: [-4.0180, 5.3390] },
                    type: 'danger',
                  }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };

    const resultats = await calculerItineraires(depart, arrivee, { eviterDangers: true }, { supabase: mockSupabase });
    const lignesUtilisees = resultats.flatMap((r) => r.etapes.filter((e) => e.ligne).map((e) => e.ligne.id));
    const ligneAdjamePlateau = seedAvecIds.find((l) => l.nom_ligne === 'Gbaka Adjamé-Plateau');
    if (ligneAdjamePlateau) {
      expect(lignesUtilisees).not.toContain(ligneAdjamePlateau.id);
    }
  });

  it('5. ne pas exclure si signalement expire', async () => {
    const depart = { lat: 5.3580, lng: -4.0190 };
    const arrivee = { lat: 5.3196, lng: -4.0167 };

    const mockSupabase = {
      from: vi.fn((table) => {
        if (table === 'lignes_fiables') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: seedAvecIds, error: null }),
            }),
          };
        }
        if (table === 'signalements') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gt: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };

    const resultats = await calculerItineraires(depart, arrivee, { eviterDangers: true }, { supabase: mockSupabase });
    expect(resultats.length).toBeGreaterThan(0);
  });

  it('6. trie correctement : moins cher en premier si durees similaires', async () => {
    const depart = { lat: 5.3580, lng: -4.0190 };
    const arrivee = { lat: 5.3196, lng: -4.0167 };
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    if (resultats.length > 1) {
      for (let i = 1; i < resultats.length; i++) {
        expect(resultats[i - 1].score).toBeGreaterThanOrEqual(resultats[i].score);
      }
    }
  });

  it('7. gere le cas depart = arrivee (< 100m)', async () => {
    const point = { lat: 5.3580, lng: -4.0190 };
    const resultats = await calculerItineraires(point, { lat: 5.3581, lng: -4.0191 }, {}, { modeHorsLigne: true });
    expect(resultats).toHaveLength(1);
    expect(resultats[0].etapes[0].type).toBe('marche');
    expect(resultats[0].prixTotal).toBe(0);
  });

  it('8. fonctionne avec des lignes au prix null', async () => {
    const { getToutesLignesLocales } = await import('../lib/db-locale');
    const lignesSansPrix = seedAvecIds.map((l, i) =>
      i === 0 ? { ...l, prix: null } : l
    );
    getToutesLignesLocales.mockResolvedValueOnce(lignesSansPrix);

    const ligne0 = lignesSansPrix[0];
    const depart = ligne0.depart_coords;
    const arrivee = ligne0.arrivee_coords;
    const resultats = await calculerItineraires(depart, arrivee, {}, { modeHorsLigne: true });
    expect(resultats.length).toBeGreaterThan(0);
    const avecNull = resultats.find((r) => r.etapes.some((e) => e.ligne?.prix === null));
    if (avecNull) {
      expect(avecNull.prixTotal).toBe(0);
    }
  });
});
