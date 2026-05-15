import { useState, useEffect } from 'react';
import { usePrix } from '../../hooks/usePrix';
import { COULEURS_CONTEXTE_GRAPHE, LIBELLES_CONTEXTE } from '../../lib/prix';

const TRANCHES = [5, 8, 11, 14, 17, 20, 23];
const BAR_W = 28;
const CHART_H = 120;
const CHART_PADDING = 24;

export default function HistoriquePrix({ ligneId, prixBase }) {
  const { chargerHistorique } = usePrix(ligneId);
  const [donnees, setDonnees] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!ligneId) return;
    chargerHistorique(7).then((d) => {
      setDonnees(d || []);
      setChargement(false);
    });
  }, [ligneId, chargerHistorique]);

  if (chargement) return null;

  const totalSignaux = donnees.reduce((s, d) => s + d.nb_signaux, 0);
  if (totalSignaux < 5) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
        <p className="text-xs text-gray-400">Pas encore assez de données de prix</p>
      </div>
    );
  }

  const barres = TRANCHES.map((h) => {
    const items = donnees.filter((d) => d.heure_locale >= h && d.heure_locale < h + 3);
    if (items.length === 0) return { heure: h, prix: prixBase || 0, contexte: 'normal' };
    const best = items.sort((a, b) => b.nb_signaux - a.nb_signaux)[0];
    return { heure: h, prix: best.prix_median, contexte: best.contexte };
  });

  const maxPrix = Math.max(...barres.map((b) => b.prix), prixBase || 0, 1);
  const chartW = TRANCHES.length * (BAR_W + 8) + CHART_PADDING;

  const contextesVus = [...new Set(barres.map((b) => b.contexte))];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase">Prix selon l'heure</p>

      <svg viewBox={`0 0 ${chartW} ${CHART_H + 20}`} className="w-full">
        {prixBase > 0 && (
          <>
            <line
              x1={CHART_PADDING}
              y1={CHART_H - (prixBase / maxPrix) * (CHART_H - 10)}
              x2={chartW - 4}
              y2={CHART_H - (prixBase / maxPrix) * (CHART_H - 10)}
              stroke="#D1D5DB"
              strokeDasharray="4 3"
              strokeWidth="1"
            />
            <text
              x={CHART_PADDING - 2}
              y={CHART_H - (prixBase / maxPrix) * (CHART_H - 10) - 3}
              fontSize="8"
              fill="#9CA3AF"
              textAnchor="end"
            >
              {prixBase}F
            </text>
          </>
        )}

        {barres.map((b, i) => {
          const x = CHART_PADDING + i * (BAR_W + 8);
          const h = Math.max(4, (b.prix / maxPrix) * (CHART_H - 10));
          const y = CHART_H - h;
          const fill = COULEURS_CONTEXTE_GRAPHE[b.contexte] || '#16A34A';
          return (
            <g key={b.heure}>
              <rect x={x} y={y} width={BAR_W} height={h} rx={4} fill={fill} opacity={0.85} />
              <text
                x={x + BAR_W / 2}
                y={y - 3}
                fontSize="8"
                fill="#6B7280"
                textAnchor="middle"
              >
                {b.prix}F
              </text>
              <text
                x={x + BAR_W / 2}
                y={CHART_H + 12}
                fontSize="8"
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {b.heure}h
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400">
        {contextesVus.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: COULEURS_CONTEXTE_GRAPHE[c] }}
            />
            {LIBELLES_CONTEXTE[c]}
          </span>
        ))}
      </div>
    </div>
  );
}
