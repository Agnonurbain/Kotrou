import { fr } from '../../i18n/fr';

const COULEURS = {
  gbaka: '#F97316',
  woro: '#3B82F6',
  sotra: '#8B5CF6',
};

const LABELS = {
  gbaka: fr.transport.gbaka,
  woro: fr.transport.woro,
  sotra: fr.transport.sotra,
};

export function creerElementMarqueur(gare) {
  const couleur = COULEURS[gare.type] || '#F97316';
  const taille = Math.max(8, Math.min(16, (gare.confiance || 1) * 3));

  const el = document.createElement('div');
  el.style.cssText = `
    width: ${taille}px;
    height: ${taille}px;
    background: ${couleur};
    border-radius: 50%;
    border: 2px solid white;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform 0.15s;
  `;

  el.addEventListener('pointerdown', () => { el.style.transform = 'scale(1.3)'; });
  el.addEventListener('pointerup', () => { el.style.transform = 'scale(1)'; });
  el.addEventListener('pointerleave', () => { el.style.transform = 'scale(1)'; });

  return el;
}

export function creerPopupHtml(gare) {
  const label = LABELS[gare.type] || gare.type;
  const confiance = gare.confiance || 0;
  const etoiles = '★'.repeat(Math.min(confiance, 5)) + '☆'.repeat(Math.max(0, 5 - confiance));

  return `
    <div style="min-width:120px">
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">${gare.nom || gare.depart_gare || ''}</div>
      <div style="font-size:11px;color:#666">${label}</div>
      <div style="font-size:11px;color:#F97316;margin-top:2px">${etoiles}</div>
    </div>
  `;
}
