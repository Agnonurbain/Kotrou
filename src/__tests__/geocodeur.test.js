import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

let geocoder;

const mockFetch = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  global.fetch = mockFetch;

  const indexedDB = (await import('fake-indexeddb')).default;
  const IDBKeyRange = (await import('fake-indexeddb')).IDBKeyRange;
  global.indexedDB = indexedDB;
  global.IDBKeyRange = IDBKeyRange;

  const mod = await import('../lib/geocodeur');
  geocoder = mod.geocoder;
});

describe('geocodeur', () => {
  it('retourne des coordonnees pour une adresse connue', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '5.3580', lon: '-4.0190' }],
    });

    const result = await geocoder('Gare Adjamé', 'Adjamé');
    expect(result).not.toBeNull();
    expect(result.lat).toBeCloseTo(5.358, 2);
    expect(result.lng).toBeCloseTo(-4.019, 2);
    expect(result.lat).toBeGreaterThan(5.15);
    expect(result.lat).toBeLessThan(5.5);
    expect(result.lng).toBeGreaterThan(-4.2);
    expect(result.lng).toBeLessThan(-3.8);
  });

  it('retourne null pour une adresse introuvable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await geocoder('ZZZZZ Adresse Inexistante XYZ 99999');
    expect(result).toBeNull();
  });

  it('utilise le cache au 2eme appel avec la meme adresse', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '5.3600', lon: '-4.0167' }],
    });

    const result1 = await geocoder('Place de la République', 'Adjamé');
    const callCount = mockFetch.mock.calls.length;

    const result2 = await geocoder('Place de la République', 'Adjamé');
    expect(mockFetch).toHaveBeenCalledTimes(callCount);
    expect(result2).toEqual(result1);
  });
});
