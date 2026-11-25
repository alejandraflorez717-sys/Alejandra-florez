import React, { useMemo, useState } from 'react';
import { binomialPMF } from '../../utils/statsEngine';

interface BinomialChartProps {
  n: number;
  p: number;
  k: number;
  mode: 'exact' | 'atMost' | 'atLeast';
}

export const BinomialChart: React.FC<BinomialChartProps> = ({ n, p, k, mode }) => {
  const [hoveredK, setHoveredK] = useState<number | null>(null);

  const bars = useMemo(() => {
    const out: Array<{ i: number; prob: number; active: boolean }> = [];
    for (let i = 0; i <= n; i++) {
      const prob = binomialPMF(n, i, p);
      const active =
        mode === 'exact' ? i === k : mode === 'atMost' ? i <= k : i >= k;
      out.push({ i, prob, active });
    }
    return out;
  }, [n, p, k, mode]);

  const width = 760;
  const height = 290;
  const padLeft = 54;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 46;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxProb = Math.max(...bars.map((b) => b.prob), 0.05) * 1.15;
  const slotW = plotW / Math.max(1, bars.length);
  const barW = Math.max(2, Math.min(34, slotW * 0.74));
  const labelStep = n <= 20 ? 1 : n <= 40 ? 2 : n <= 70 ? 5 : 10;

  const expectedMean = n * p;
  const meanX = padLeft + ((expectedMean + 0.5) / Math.max(1, bars.length)) * plotW;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxProb * f);

  return (
    <div className="w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Gráfica de distribución binomial"
      >
        {yTicks.map((val, idx) => {
          const y = padTop + plotH - (val / maxProb) * plotH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#EFE7E2"
                strokeDasharray="3 4"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#7C6D75] text-[10px] font-mono tabular-nums"
              >
                {(val * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}

        {bars.map((bar) => {
          const cx = padLeft + (bar.i + 0.5) * slotW;
          const barH = (bar.prob / maxProb) * plotH;
          const y = padTop + plotH - barH;
          const isHovered = hoveredK === bar.i;

          const fill = bar.active
            ? isHovered
              ? '#9E3E5D'
              : '#C85A7C'
            : isHovered
            ? '#B5A1D9'
            : '#E7DCD5';

          return (
            <g
              key={bar.i}
              onMouseEnter={() => setHoveredK(bar.i)}
              onMouseLeave={() => setHoveredK(null)}
              className="cursor-pointer"
            >
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={Math.max(1.5, barH)}
                rx={Math.min(4, barW / 2)}
                fill={fill}
              />
              {bar.i % labelStep === 0 && (
                <text
                  x={cx}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  className={`text-[10px] font-mono tabular-nums ${
                    bar.active ? 'fill-[#8F2E4D] font-semibold' : 'fill-[#7C6D75]'
                  }`}
                >
                  {bar.i}
                </text>
              )}
            </g>
          );
        })}

        {/* Expected value line E[X] = n * p */}
        <line
          x1={meanX}
          y1={padTop}
          x2={meanX}
          y2={padTop + plotH}
          stroke="#7B61B3"
          strokeWidth={1.6}
          strokeDasharray="4 4"
        />
        <text
          x={meanX}
          y={padTop + 12}
          textAnchor="middle"
          className="fill-[#62489A] text-[10px] font-mono font-semibold tabular-nums"
        >
          E(X)={expectedMean.toFixed(1)}
        </text>

        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={width - padRight}
          y2={padTop + plotH}
          stroke="#C7B8B0"
          strokeWidth={1.25}
        />

        <text
          x={padLeft + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-[#5A4C53] text-[11px]"
        >
          Cantidad de éxitos (k)
        </text>
      </svg>

      {hoveredK !== null && bars[hoveredK] ? (
        <div className="mt-2 flex items-center justify-between text-xs text-[#231A20] bg-[#F5EFEA] px-3 py-1.5 rounded-lg border border-[#EADFD9] font-mono tabular-nums">
          <span>k = {hoveredK} éxitos</span>
          <span>P(X = {hoveredK}) = {bars[hoveredK].prob.toFixed(5)}</span>
          <span>Probabilidad: {(bars[hoveredK].prob * 100).toFixed(2)}%</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between text-xs text-[#7C6D75] px-1">
          <span>Barras rosa: éxitos incluidos en el evento seleccionado</span>
          <span>Línea lila: media esperada μ = n·p = {expectedMean.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};
