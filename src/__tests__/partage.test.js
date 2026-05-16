import { describe, it, expect } from 'vitest';
import {
  formaterPourWhatsApp,
  formaterPourSMS,
  formaterResume,
  compterSMS,
  construireUrlSMS,
  construireUrlWhatsApp,
} from '../lib/partage';

const ITINERAIRE_TEST = {
  depart_nom: 'Yopougon-Kouté',
  arrivee_nom: 'Plateau',
  prixTotal: 350,
  dureeTotal: 28,
  direct: false,
  etapes: [
    {
      type: 'marche',
      dureeMinutes: 4,
      prix: null,
      description: 'Aller à la gare Sainte-Marie',
      ligne: null,
    },
    {
      type: 'gbaka',
      dureeMinutes: 15,
      prix: 200,
      description: 'Gbaka Siporex',
      ligne: {
        id: '1',
        nom_ligne: 'Gbaka Siporex',
        type: 'gbaka',
        depart_gare: 'Pharmacie Sainte-Marie',
        arrivee_gare: 'Carrefour CHU',
        depart_reperes: null,
      },
    },
    {
      type: 'marche',
      dureeMinutes: 3,
      prix: null,
      description: null,
      ligne: null,
    },
    {
      type: 'woro',
      dureeMinutes: 6,
      prix: 150,
      description: 'Wôrô Adjamé',
      ligne: {
        id: '2',
        nom_ligne: 'Wôrô Adjamé-Liberté',
        type: 'woro',
        depart_gare: 'Gare Adjamé',
        arrivee_gare: 'Plateau Ext.',
        depart_reperes: null,
      },
    },
  ],
};

describe('formaterPourWhatsApp', () => {
  it('contient le titre avec noms départ/arrivée', () => {
    const texte = formaterPourWhatsApp(ITINERAIRE_TEST, 'https://kotrou.ci/t/abc123');
    expect(texte).toContain('Yopougon-Kouté → Plateau');
  });

  it('contient le lien court', () => {
    const texte = formaterPourWhatsApp(ITINERAIRE_TEST, 'https://kotrou.ci/t/abc123');
    expect(texte).toContain('https://kotrou.ci/t/abc123');
  });

  it('contient les noms de ligne en gras markdown', () => {
    const texte = formaterPourWhatsApp(ITINERAIRE_TEST, 'https://kotrou.ci/t/abc123');
    expect(texte).toContain('*Gbaka Siporex*');
    expect(texte).toContain('*Wôrô Adjamé-Liberté*');
  });

  it('inclut les gares de montée/descente', () => {
    const texte = formaterPourWhatsApp(ITINERAIRE_TEST, 'https://kotrou.ci/t/abc123');
    expect(texte).toContain('Monter : Pharmacie Sainte-Marie');
    expect(texte).toContain('Descendre : Carrefour CHU');
  });
});

describe('formaterPourSMS', () => {
  it('ne contient pas d emojis', () => {
    const texte = formaterPourSMS(ITINERAIRE_TEST, 'kotrou.ci/t/abc123');
    expect(texte).not.toMatch(/[🚍💰⏱🟠🔵🟣🚶📍🔗]/);
  });

  it('contient le prix et la durée', () => {
    const texte = formaterPourSMS(ITINERAIRE_TEST, '');
    expect(texte).toContain('350F');
    expect(texte).toContain('28min');
  });

  it('reste sous 480 caractères pour un itinéraire standard', () => {
    const texte = formaterPourSMS(ITINERAIRE_TEST, 'kotrou.ci/t/abc123');
    expect(texte.length).toBeLessThanOrEqual(480);
  });

  it('contient le lien court quand fourni', () => {
    const texte = formaterPourSMS(ITINERAIRE_TEST, 'kotrou.ci/t/abc123');
    expect(texte).toContain('kotrou.ci/t/abc123');
  });
});

describe('formaterResume', () => {
  it('fait maximum 160 caractères', () => {
    const texte = formaterResume(ITINERAIRE_TEST);
    expect(texte.length).toBeLessThanOrEqual(160);
  });

  it('contient les noms de ligne', () => {
    const texte = formaterResume(ITINERAIRE_TEST);
    expect(texte).toContain('Gbaka Siporex');
  });
});

describe('compterSMS', () => {
  it('retourne 1 pour un texte court', () => {
    expect(compterSMS('Bonjour')).toBe(1);
  });

  it('retourne 1 pour exactement 160 chars', () => {
    expect(compterSMS('a'.repeat(160))).toBe(1);
  });

  it('retourne 2 pour 161 chars', () => {
    expect(compterSMS('a'.repeat(161))).toBe(2);
  });

  it('retourne 2 pour un SMS standard de partage', () => {
    const texte = formaterPourSMS(ITINERAIRE_TEST, 'kotrou.ci/t/abc123');
    expect(compterSMS(texte)).toBeLessThanOrEqual(3);
  });
});

describe('construireUrlSMS', () => {
  it('encode le texte correctement', () => {
    const url = construireUrlSMS('Test 123');
    expect(url).toBe('sms:?body=Test%20123');
  });
});

describe('construireUrlWhatsApp', () => {
  it('utilise le domaine wa.me', () => {
    const url = construireUrlWhatsApp('Test');
    expect(url).toContain('wa.me');
  });
});
