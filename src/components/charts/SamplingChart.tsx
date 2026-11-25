import React, { useMemo, useState } from 'react';
import { computeHistogram, normalPDF } from '../../utils/statsEngine';

interface SamplingChartProps {
  sampleMeans: number[];
  popMean: number;
  meanOfSampleMeans: number;
  theoreticalSE: number;
  unit?: string;
}

export const SamplingChart: React.FC<SamplingChartProps> = ({
  sampleMeans,
  popMean,
  meanOfSampleMeans,
  theoreticalSE,
  unit = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const bins = useMemo(() => {
    const requested = Math.max(6, Math.min(12, Math.ceil(Math.sqrt(sampleMeans.length))));
    return computeHistogram(sampleMeans, requested);
  }, [sampleMeans]);

  if (bins.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[#7C6D75]">
        Genera muestras aleatorias para visualizar la distribución muestral.
      </div>
    );
  }

  const width = 760;
  const height = 295;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 28;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const rawMin = Math.min(bins[0].start, popMean - 3 * theoreticalSE);
  const rawMax = Math.max(bins[bins.length - 1].end, popMean + 3 * theoreticalSE);
  const minVal = rawMin;
  const maxVal = rawMax > rawMin ? rawMax : rawMin + 1;
  const binWidth = bins[0].end - bins[0].start || 1;

  const maxBinCount = Math.max(...bins.map((b) => b.count), 1);
  const theoreticalPeak =
    theoreticalSE > 0
      ? sampleMeans.length * binWidth * normalPDF(popMean, popMean, theoreticalSE)
      : 0;
  const maxY = Math.max(maxBinCount, theoreticalPeak) * 1.15;

  const toSvgX = (val: number) => padLeft + ((val - minVal) / (maxVal - minVal)) * plotW;
  const toSvgY = (countVal: number) => padTop + plotH - (countVal / maxY) * plotH;

  let curvePath = '';
  if (theoreticalSE > 0) {
    const steps = 140;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = minVal + (i / steps) * (maxVal - minVal);
      const yVal = sampleMeans.length * binWidth * normalPDF(x, popMean, theoreticalSE);
      pts.push(`${i === 0 ? 'M' : 'L'} ${toSvgX(x).toFixed(2)} ${toSvgY(yVal).toFixed(2)}`);
    }
    curvePath = pts.join(' ');
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  return (
    <div className="w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Distribución de las medias muestrales comparada con la media general"
      >
        {yTicks.map((val, idx) => {
          const y = toSvgY(val);
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
                {val}
              </text>
            </g>
          );
        })}

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
                fill={isHovered ? '#9E3E5D' : '#E7A3B8'}
                stroke="#C85A7C"
                strokeWidth={0.9}
              />
              <text
                x={x1 + 1.5 + barW / 2}
                y={padTop + plotH + 17}
                textAnchor="middle"
                className="fill-[#5A4C53] text-[10px] font-mono tabular-nums"
              >
                {bin.midpoint.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Theoretical CLT Normal Curve */}
        {curvePath && (
          <path
            d={curvePath}
            fill="none"
            stroke="#7B61B3"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}

        {/* Population Mean Marker */}
        <line
          x1={toSvgX(popMean)}
          y1={padTop}
          x2={toSvgX(popMean)}
          y2={padTop + plotH}
          stroke="#7B61B3"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        <text
          x={toSvgX(popMean)}
          y={padTop - 8}
          textAnchor="middle"
          className="fill-[#62489A] text-[11px] font-mono font-semibold tabular-nums"
        >
          μ={popMean.toFixed(2)}
        </text>

        {/* Empirical Mean of Sample Means */}
        <line
          x1={toSvgX(meanOfSampleMeans)}
          y1={padTop + 14}
          x2={toSvgX(meanOfSampleMeans)}
          y2={padTop + plotH}
          stroke="#9E3E5D"
          strokeWidth={2}
        />
        <text
          x={toSvgX(meanOfSampleMeans)}
          y={padTop + plotH + 38}
          textAnchor="middle"
          className="fill-[#8F2E4D] text-[11px] font-mono font-semibold tabular-nums"
        >
          x̄ₘ={meanOfSampleMeans.toFixed(2)}
          {unit ? ` ${unit}` : ''}
        </text>

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
            Rango media: [{bins[hoveredIdx].start.toFixed(2)}, {bins[hoveredIdx].end.toFixed(2)}]
          </span>
          <span>Muestras en rango: {bins[hoveredIdx].count}</span>
          <span>{(bins[hoveredIdx].relative * 100).toFixed(1)}% de muestras</span>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7C6D75] px-1">
          <span>Línea punteada lila: media general μ = {popMean.toFixed(2)}</span>
          <span>Línea sólida rosa: media de las muestras x̄ₘ = {meanOfSampleMeans.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};
