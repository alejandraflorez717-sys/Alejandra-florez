import React, { useMemo, useState } from 'react';
import { normalPDF } from '../../utils/statsEngine';

interface NormalCurveChartProps {
  mean: number;
  std: number;
  mode: 'less' | 'greater' | 'between';
  x1: number;
  x2?: number;
  unit?: string;
  isStandardZ?: boolean;
}

export const NormalCurveChart: React.FC<NormalCurveChartProps> = ({
  mean,
  std,
  mode,
  x1,
  x2 = x1,
  unit = '',
  isStandardZ = false,
}) => {
  const [hoverX, setHoverX] = useState<number | null>(null);

  const safeStd = std > 0 ? std : 1;
  const width = 760;
  const height = 310;
  const padLeft = 52;
  const padRight = 28;
  const padTop = 28;
  const padBottom = 54;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minX = mean - 3.6 * safeStd;
  const maxX = mean + 3.6 * safeStd;
  const peakY = normalPDF(mean, mean, safeStd);

  const toSvgX = (val: number) => {
    const clamped = Math.max(minX, Math.min(maxX, val));
    return padLeft + ((clamped - minX) / (maxX - minX)) * plotW;
  };

  const toSvgY = (density: number) => {
    return padTop + plotH - (density / (peakY * 1.12)) * plotH;
  };

  const { curvePath, shadedPaths } = useMemo(() => {
    const steps = 220;
    const pts: Array<{ x: number; y: number; svgX: number; svgY: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const x = minX + (i / steps) * (maxX - minX);
      const y = normalPDF(x, mean, safeStd);
      pts.push({ x, y, svgX: toSvgX(x), svgY: toSvgY(y) });
    }

    const line = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.svgX.toFixed(2)} ${p.svgY.toFixed(2)}`)
      .join(' ');

    const buildAreaPath = (a: number, b: number) => {
      const lo = Math.max(minX, Math.min(a, b));
      const hi = Math.min(maxX, Math.max(a, b));
      if (hi <= lo) return '';
      const areaSteps = 120;
      const areaPts: string[] = [];
      areaPts.push(`M ${toSvgX(lo).toFixed(2)} ${(padTop + plotH).toFixed(2)}`);
      for (let i = 0; i <= areaSteps; i++) {
        const xv = lo + (i / areaSteps) * (hi - lo);
        const yv = normalPDF(xv, mean, safeStd);
        areaPts.push(`L ${toSvgX(xv).toFixed(2)} ${toSvgY(yv).toFixed(2)}`);
      }
      areaPts.push(`L ${toSvgX(hi).toFixed(2)} ${(padTop + plotH).toFixed(2)} Z`);
      return areaPts.join(' ');
    };

    const areas: string[] = [];
    if (mode === 'less') {
      areas.push(buildAreaPath(minX, x1));
    } else if (mode === 'greater') {
      areas.push(buildAreaPath(x1, maxX));
    } else {
      const lo = Math.min(x1, x2);
      const hi = Math.max(x1, x2);
      areas.push(buildAreaPath(lo, hi));
    }

    return { curvePath: line, shadedPaths: areas };
  }, [mean, safeStd, minX, maxX, mode, x1, x2, plotH, plotW]);

  const ticks = [-3, -2, -1, 0, 1, 2, 3].map((k) => {
    const val = mean + k * safeStd;
    return {
      k,
      val,
      svgX: toSvgX(val),
      label: isStandardZ ? `${k === 0 ? '0' : k > 0 ? `+${k}` : k}` : val.toFixed(1),
    };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX < padLeft || relX > width - padRight) {
      setHoverX(null);
      return;
    }
    const val = minX + ((relX - padLeft) / plotW) * (maxX - minX);
    setHoverX(val);
  };

  const markerPositions =
    mode === 'between'
      ? [
          { label: isStandardZ ? 'Z₁' : 'X₁', value: Math.min(x1, x2) },
          { label: isStandardZ ? 'Z₂' : 'X₂', value: Math.max(x1, x2) },
        ]
      : [{ label: isStandardZ ? 'Z' : 'X', value: x1 }];

  const hoverDensity = hoverX !== null ? normalPDF(hoverX, mean, safeStd) : 0;
  const hoverZ = hoverX !== null ? (hoverX - mean) / safeStd : 0;

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
        role="img"
        aria-label="Gráfica de distribución normal con área de probabilidad sombreada"
      >
        <defs>
          <linearGradient id="roseShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D96B8A" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#F4CFD9" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Horizontal subtle grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padTop + plotH * (1 - frac);
          return (
            <line
              key={frac}
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#EFE7E2"
              strokeDasharray="3 4"
            />
          );
        })}

        {/* Shaded probability region */}
        {shadedPaths.map((d, i) =>
          d ? <path key={i} d={d} fill="url(#roseShade)" /> : null
        )}

        {/* Mean center line */}
        <line
          x1={toSvgX(mean)}
          y1={padTop}
          x2={toSvgX(mean)}
          y2={padTop + plotH}
          stroke="#B89378"
          strokeWidth={1.25}
          strokeDasharray="4 4"
        />

        {/* Bell curve stroke */}
        <path d={curvePath} fill="none" stroke="#7B61B3" strokeWidth={2.75} strokeLinecap="round" />

        {/* Baseline axis */}
        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={width - padRight}
          y2={padTop + plotH}
          stroke="#C7B8B0"
          strokeWidth={1.25}
        />

        {/* Sigma ticks */}
        {ticks.map((t) => (
          <g key={t.k}>
            <line
              x1={t.svgX}
              y1={padTop + plotH}
              x2={t.svgX}
              y2={padTop + plotH + 6}
              stroke="#A99991"
            />
            <text
              x={t.svgX}
              y={padTop + plotH + 20}
              textAnchor="middle"
              className="fill-[#5A4C53] text-[11px] font-mono tabular-nums"
            >
              {t.label}
            </text>
            <text
              x={t.svgX}
              y={padTop + plotH + 35}
              textAnchor="middle"
              className="fill-[#8E7D85] text-[10px]"
            >
              {t.k === 0 ? (isStandardZ ? 'μ=0' : 'μ') : `${t.k > 0 ? '+' : ''}${t.k}σ`}
            </text>
          </g>
        ))}

        {/* Boundary markers */}
        {markerPositions.map((m) => {
          const sx = toSvgX(m.value);
          const clamped = m.value >= minX && m.value <= maxX;
          const my = toSvgY(normalPDF(m.value, mean, safeStd));
          return (
            <g key={m.label}>
              <line
                x1={sx}
                y1={clamped ? my : padTop + plotH - 40}
                x2={sx}
                y2={padTop + plotH}
                stroke="#A83C5E"
                strokeWidth={2}
              />
              {clamped && (
                <circle cx={sx} cy={my} r={4.5} fill="#C85A7C" stroke="#FFFFFF" strokeWidth={1.5} />
              )}
              <rect
                x={sx - 34}
                y={padTop - 2}
                width={68}
                height={20}
                rx={4}
                fill="#FFFFFF"
                stroke="#DFC4CE"
              />
              <text
                x={sx}
                y={padTop + 11}
                textAnchor="middle"
                className="fill-[#8F2E4D] text-[11px] font-mono font-semibold tabular-nums"
              >
                {m.label}={m.value.toFixed(2)}
                {unit && !isStandardZ ? ` ${unit}` : ''}
              </text>
            </g>
          );
        })}

        {/* Hover guide */}
        {hoverX !== null && (
          <g>
            <line
              x1={toSvgX(hoverX)}
              y1={padTop}
              x2={toSvgX(hoverX)}
              y2={padTop + plotH}
              stroke="#7B61B3"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.7}
            />
            <circle
              cx={toSvgX(hoverX)}
              cy={toSvgY(hoverDensity)}
              r={4}
              fill="#7B61B3"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {hoverX !== null && (
        <div className="mt-1 flex items-center justify-between text-xs text-[#5A4C53] bg-[#F5EFEA] px-3 py-1.5 rounded-lg border border-[#EADFD9] font-mono tabular-nums">
          <span>
            Cursor: {isStandardZ ? 'Z' : 'X'} = {hoverX.toFixed(2)}
            {unit && !isStandardZ ? ` ${unit}` : ''}
          </span>
          <span>Z = {hoverZ.toFixed(2)}</span>
          <span>f(x) = {hoverDensity.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
};
