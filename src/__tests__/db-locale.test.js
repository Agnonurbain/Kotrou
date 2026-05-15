import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { sauvegarderCommune, getLignesLocales, supprimerCommune, getCommunesTelecharges } from '../lib/db-locale';

const lignesTest = [
  { id: 'ligne-1', nom_ligne: 'Test Ligne 1', depart_commune: 'adjame', type: 'gbaka' },
  { id: 'ligne-2', nom_ligne: 'Test Ligne 2', depart_commune: 'adjame', type: 'woro' },
];

describe('db-locale', () => {
  it('sauvegarder puis récupérer des lignes', async () => {
    await sauvegarderCommune('adjame', lignesTest);
    const result = await getLignesLocales('adjame');
    expect(result).toHaveLength(2);
    expect(result[0].nom_ligne).toBe('Test Ligne 1');
  });

  it('remplace les données existantes', async () => {
    await sauvegarderCommune('adjame', lignesTest);
    await sauvegarderCommune('adjame', [{ id: 'ligne-3', nom_ligne: 'Nouvelle', depart_commune: 'adjame', type: 'sotra' }]);
    const result = await getLignesLocales('adjame');
    expect(result).toHaveLength(1);
    expect(result[0].nom_ligne).toBe('Nouvelle');
  });

  it('supprime les données d\'une commune', async () => {
    await sauvegarderCommune('cocody', [{ id: 'ligne-c1', nom_ligne: 'Cocody 1', depart_commune: 'cocody', type: 'gbaka' }]);
    await supprimerCommune('cocody');
    const result = await getLignesLocales('cocody');
    expect(result).toHaveLength(0);
  });

  it('liste les communes téléchargées', async () => {
    await sauvegarderCommune('adjame', lignesTest);
    await sauvegarderCommune('cocody', [{ id: 'c1', nom_ligne: 'C1', depart_commune: 'cocody', type: 'gbaka' }]);
    const communes = await getCommunesTelecharges();
    expect(communes).toHaveLength(2);
    expect(communes.map((c) => c.communeId).sort()).toEqual(['adjame', 'cocody']);
  });
});
