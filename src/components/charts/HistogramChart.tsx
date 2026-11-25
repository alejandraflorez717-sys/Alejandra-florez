import React, { useState } from 'react';
import { HistogramBin } from '../../types/survey';
import { normalPDF } from '../../utils/statsEngine';

interface HistogramChartProps {
  bins: HistogramBin[];
  mean: number;
  std: number;
  totalCount: number;
  unit?: string;
  showNormalOverlay?: boolean;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  bins,
  mean,
  std,
  totalCount,
  unit = '',
  showNormalOverlay = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (bins.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[#7C6D75]">
        Sin datos numéricos suficientes para graficar.
      </div>
    );
  }

  const width = 720;
  const height = 290;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = bins[0].start;
  const maxVal = bins[bins.length - 1].end;
  const binWidth = bins[0].end - bins[0].start || 1;

  const maxBinCount = Math.max(...bins.map((b) => b.count), 1);
  // Convert normal PDF density into expected count per bin: N * binWidth * pdf(x)
  const normalMaxCount =
    showNormalOverlay && std > 0 ? totalCount * binWidth * normalPDF(mean, mean, std) : 0;
  const maxY = Math.max(maxBinCount, normalMaxCount) * 1.15;

  const toSvgX = (val: number) => {
    if (maxVal === minVal) return padLeft + plotW / 2;
    return padLeft + ((val - minVal) / (maxVal - minVal)) * plotW;
  };

  const toSvgY = (countVal: number) => {
    return padTop + plotH - (countVal / maxY) * plotH;
  };

  let normalPath = '';
  if (showNormalOverlay && std > 0 && maxVal > minVal) {
    const steps = 120;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = minVal + (i / steps) * (maxVal - minVal);
      const expectedCount = totalCount * binWidth * normalPDF(x, mean, std);
      pts.push(`${i === 0 ? 'M' : 'L'} ${toSvgX(x).toFixed(2)} ${toSvgY(expectedCount).toFixed(2)}`);
    }
    normalPath = pts.join(' ');
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  return (
    <div className="w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Histograma de frecuencias de la variable numérica"
      >
        {yTicks.map((tick, idx) => {
          const y = toSvgY(tick);
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
                className="fill-[#7C6D75] text-[11px] font-mono tabular-nums"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Histogram Bars */}
        {bins.map((bin, idx) => {
          const x1 = toSvgX(bin.start);
          const x2 = toSvgX(bin.end);
          const barW = Math.max(4, x2 - x1 - 3);
          const barH = (bin.count / maxY) * plotH;
          const y = padTop + plotH - barH;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x1 + 1.5}
                y={y}
                width={barW}
                height={Math.max(0, barH)}
                rx={4}
                fill={isHovered ? '#B5476B' : '#E7A3B8'}
                stroke="#C85A7C"
                strokeWidth={isHovered ? 1.5 : 0.8}
              />
              {bin.count > 0 && (
                <text
                  x={x1 + 1.5 + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="fill-[#5A4C53] text-[10px] font-mono font-medium tabular-nums"
                >
                  {bin.count}
                </text>
              )}
              <text
                x={x1 + 1.5 + barW / 2}
                y={padTop + plotH + 17}
                textAnchor="middle"
                className="fill-[#5A4C53] text-[10px] font-mono tabular-nums"
              >
                {bin.start.toFixed(0)}–{bin.end.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Normal Curve Overlay */}
        {normalPath && (
          <path
            d={normalPath}
            fill="none"
            stroke="#7B61B3"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}

        {/* Mean Vertical Marker */}
        {mean >= minVal && mean <= maxVal && (
          <g>
            <line
              x1={toSvgX(mean)}
              y1={padTop}
              x2={toSvgX(mean)}
              y2={padTop + plotH}
              stroke="#7B61B3"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={toSvgX(mean)}
              y={padTop + plotH + 36}
              textAnchor="middle"
              className="fill-[#62489A] text-[11px] font-mono font-semibold tabular-nums"
            >
              μ = {mean.toFixed(2)}
              {unit ? ` ${unit}` : ''}
            </text>
          </g>
        )}

        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={width - padRight}
          y2={padTop + plotH}
          stroke="#C7B8B0"
          strokeWidth={1.25}
        />
      </svg>

      {hoveredIdx !== null && bins[hoveredIdx] ? (
        <div className="mt-2 flex items-center justify-between text-xs text-[#231A20] bg-[#F5EFEA] px-3 py-1.5 rounded-lg border border-[#EADFD9] font-mono tabular-nums">
          <span>
            Intervalo: [{bins[hoveredIdx].start.toFixed(1)}, {bins[hoveredIdx].end.toFixed(1)}]
            {unit ? ` ${unit}` : ''}
          </span>
          <span>Frecuencia: {bins[hoveredIdx].count} encuestados</span>
          <span>Porcentaje: {(bins[hoveredIdx].relative * 100).toFixed(1)}%</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between text-xs text-[#7C6D75] px-1">
          <span>Barras: frecuencia observada en la muestra</span>
          {showNormalOverlay && <span>Curva lila: ajuste normal teórico N(μ, σ²)</span>}
        </div>
      )}
    </div>
  );
};
