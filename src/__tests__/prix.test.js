import { describe, it, expect } from 'vitest';
import { detecterContexte, analyserVariation, genererValeursRapides, formaterPrix } from '../lib/prix';

describe('detecterContexte', () => {
  it('retourne nuit après 21h', () => {
    expect(detecterContexte(new Date('2026-03-10T22:30:00'))).toBe('nuit');
  });

  it('retourne nuit avant 5h', () => {
    expect(detecterContexte(new Date('2026-03-10T03:00:00'))).toBe('nuit');
  });

  it('retourne pointe_matin en semaine à 7h30', () => {
    // 2026-03-10 is a Tuesday
    expect(detecterContexte(new Date('2026-03-10T07:30:00'))).toBe('pointe_matin');
  });

  it('retourne pointe_soir en semaine à 18h', () => {
    expect(detecterContexte(new Date('2026-03-10T18:00:00'))).toBe('pointe_soir');
  });

  it('retourne weekend le samedi à 10h', () => {
    // 2026-03-14 is a Saturday
    expect(detecterContexte(new Date('2026-03-14T10:00:00'))).toBe('weekend');
  });

  it('retourne normal en semaine à 12h', () => {
    expect(detecterContexte(new Date('2026-03-10T12:00:00'))).toBe('normal');
  });

  it('retourne fin_annee le 25 décembre', () => {
    expect(detecterContexte(new Date('2026-12-25T14:00:00'))).toBe('fin_annee');
  });
});

describe('analyserVariation', () => {
  it('retourne normal si prix identique', () => {
    expect(analyserVariation(200, 200).niveau).toBe('normal');
  });

  it('retourne hausse si prix x1.5', () => {
    expect(analyserVariation(300, 200).niveau).toBe('hausse');
  });

  it('retourne forte_hausse si prix x2.5', () => {
    expect(analyserVariation(500, 200).niveau).toBe('forte_hausse');
  });

  it('retourne normal si pas de prix de base', () => {
    expect(analyserVariation(300, null).niveau).toBe('normal');
  });
});

describe('genererValeursRapides', () => {
  it('génère 5 valeurs depuis un prix de base de 200', () => {
    const valeurs = genererValeursRapides(200);
    expect(valeurs).toEqual([150, 200, 250, 300, 400]);
  });

  it('retourne des valeurs par défaut sans prix de base', () => {
    const valeurs = genererValeursRapides(null);
    expect(valeurs.length).toBeGreaterThan(3);
    expect(valeurs[0]).toBeGreaterThanOrEqual(50);
  });
});

describe('formaterPrix', () => {
  it('formate un prix avec F', () => {
    expect(formaterPrix(200)).toContain('200');
    expect(formaterPrix(200)).toContain('F');
  });

  it('retourne "Prix inconnu" si null', () => {
    expect(formaterPrix(null)).toBe('Prix inconnu');
  });
});
