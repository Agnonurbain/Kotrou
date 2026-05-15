import {
  analyserVariation,
  COULEURS_VARIATION,
  LIBELLES_CONTEXTE,
  ICONES_CONTEXTE,
  formaterPrix,
  ageCourt,
} from '../../lib/prix';

export default function BadgePrixActuel({ prixBase, prixActuel, compact = false }) {
  if (!prixActuel || !prixActuel.nb_signalements || prixActuel.nb_signalements === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
        {formaterPrix(prixBase)}
      </span>
    );
  }

  const { niveau } = analyserVariation(prixActuel.prix_median, prixBase);
  const couleur = COULEURS_VARIATION[niveau];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${couleur.fond} ${couleur.texte}`}
      >
        {couleur.icone} {formaterPrix(prixActuel.prix_median)}
      </span>
    );
  }

  return (
    <div className={`rounded-xl p-3 space-y-1 ${couleur.fond}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${couleur.texte}`}>
          {couleur.icone} {formaterPrix(prixActuel.prix_median)}
          {prixActuel.contexte && (
            <span className="font-normal ml-1">
              {ICONES_CONTEXTE[prixActuel.contexte]} {LIBELLES_CONTEXTE[prixActuel.contexte]}
            </span>
          )}
        </span>
      </div>
      {prixBase && niveau !== 'normal' && (
        <p className={`text-xs ${couleur.texte} opacity-80`}>
          Habituellement {formaterPrix(prixBase)}
        </p>
      )}
      <p className={`text-xs ${couleur.texte} opacity-60`}>
        {prixActuel.nb_signalements} usager{prixActuel.nb_signalements > 1 ? 's' : ''}
        {prixActuel.dernier_signal && ` · ${ageCourt(prixActuel.dernier_signal)}`}
      </p>
    </div>
  );
}
