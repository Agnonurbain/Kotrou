import { formaterPrix } from './prix';

export function formaterPourWhatsApp(itineraire, lienCourt) {
  const lignes = [];

  lignes.push(`🚍 *KOTROU — ${itineraire.depart_nom || 'Départ'} → ${itineraire.arrivee_nom || 'Arrivée'}*`);
  lignes.push(`💰 ${formaterPrix(itineraire.prixTotal)} · ⏱ ${itineraire.dureeTotal} min`);
  lignes.push('');

  itineraire.etapes.forEach((etape, i) => {
    const num = i + 1;

    if (etape.type === 'marche') {
      lignes.push(`${num}. 🚶 À pied ${etape.dureeMinutes} min`);
      if (etape.description) lignes.push(`   ↳ ${etape.description}`);
      return;
    }

    const icone = { gbaka: '🟠', woro: '🔵', sotra: '🟣' }[etape.type] ?? '🚌';
    const prix = etape.prix ? formaterPrix(etape.prix) : 'Prix inconnu';

    lignes.push(`${num}. ${icone} *${etape.ligne?.nom_ligne ?? etape.description}* — ${prix}`);
    if (etape.ligne?.depart_gare) lignes.push(`   ↗ Monter : ${etape.ligne.depart_gare}`);
    if (etape.ligne?.arrivee_gare) lignes.push(`   ↘ Descendre : ${etape.ligne.arrivee_gare}`);
    if (etape.ligne?.depart_reperes) lignes.push(`   📍 Repère : ${etape.ligne.depart_reperes}`);
  });

  lignes.push('');
  lignes.push(`🔗 Voir le trajet : ${lienCourt}`);
  lignes.push("_Partagé depuis Kotrou — L'appli de ceux qui connaissent leur quartier_");

  return lignes.join('\n');
}

export function formaterPourSMS(itineraire, lienCourt) {
  const lignes = [];

  lignes.push(`KOTROU - ${itineraire.depart_nom || 'Depart'} > ${itineraire.arrivee_nom || 'Arrivee'}`);
  lignes.push(`Duree: ${itineraire.dureeTotal}min - Prix: ${itineraire.prixTotal}F`);
  lignes.push('');

  itineraire.etapes.forEach((etape, i) => {
    const num = i + 1;

    if (etape.type === 'marche') {
      const dest = etape.description ? ` > ${tronquer(etape.description, 30)}` : '';
      lignes.push(`${num}. A pied ${etape.dureeMinutes}min${dest}`);
      return;
    }

    const type = etape.type.toUpperCase();
    const nom = tronquer(etape.ligne?.nom_ligne ?? '', 20);
    const prix = etape.prix ? `${etape.prix}F` : '?F';

    lignes.push(`${num}. ${type} ${nom} ${prix}`);
    if (etape.ligne?.depart_gare) lignes.push(`   Monter: ${tronquer(etape.ligne.depart_gare, 35)}`);
    if (etape.ligne?.arrivee_gare) lignes.push(`   Desc.: ${tronquer(etape.ligne.arrivee_gare, 35)}`);
  });

  if (lienCourt) {
    lignes.push('');
    lignes.push(lienCourt);
  }

  return lignes.join('\n');
}

export function formaterResume(itineraire) {
  const etapesTransport = itineraire.etapes.filter((e) => e.type !== 'marche');
  const lignesNoms = etapesTransport
    .map((e) => e.ligne?.nom_ligne ?? e.type)
    .join(' + ');

  return (
    `Kotrou: ${itineraire.depart_nom || 'Depart'}>${itineraire.arrivee_nom || 'Arrivee'} ` +
    `${itineraire.dureeTotal}min ${itineraire.prixTotal}F ` +
    `via ${lignesNoms}`
  ).slice(0, 160);
}

function tronquer(texte, max) {
  if (!texte) return '';
  if (texte.length <= max) return texte;
  return texte.slice(0, max - 1) + '.';
}

export function construireUrlSMS(texte) {
  return `sms:?body=${encodeURIComponent(texte)}`;
}

export function construireUrlWhatsApp(texte) {
  return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}

export function compterSMS(texte) {
  if (texte.length <= 160) return 1;
  return Math.ceil(texte.length / 153);
}
