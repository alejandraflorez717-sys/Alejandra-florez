import React, { useEffect, useMemo, useState } from 'react';
import { ColumnMeta, SurveyRecord } from '../../types/survey';
import {
  computeDescriptiveStats,
  getNumericValues,
  normalCDF,
  standardNormalCDF,
} from '../../utils/statsEngine';
import { NormalCurveChart } from '../charts/NormalCurveChart';

interface NormalDistributionSectionProps {
  records: SurveyRecord[];
  columns: ColumnMeta[];
  selectedNumericKey: string;
  onSelectNumericKey: (key: string) => void;
}

export const NormalDistributionSection: React.FC<NormalDistributionSectionProps> = ({
  records,
  columns,
  selectedNumericKey,
  onSelectNumericKey,
}) => {
  const numericCols = useMemo(
    () => columns.filter((c) => c.kind === 'numeric' && !c.isIdLike),
    [columns]
  );

  const activeCol =
    numericCols.find((c) => c.key === selectedNumericKey) ||
    numericCols.find((c) => c.key === 'gasto_mensual') ||
    numericCols[0];

  const values = useMemo(
    () => (activeCol ? getNumericValues(records, activeCol.key) : []),
    [records, activeCol]
  );

  const stats = useMemo(() => computeDescriptiveStats(values), [values]);
  const [stdType, setStdType] = useState<'sample' | 'population'>('sample');
  const [mode, setMode] = useState<'less' | 'greater' | 'between'>('less');

  const activeStd = stdType === 'sample' ? stats.sampleStd : stats.popStd;
  const safeStd = activeStd > 0 ? activeStd : 1;

  const [x1, setX1] = useState<number>(() => Number((stats.mean + 0.5 * safeStd).toFixed(2)));
  const [x2, setX2] = useState<number>(() => Number((stats.mean + 1.5 * safeStd).toFixed(2)));

  // Reset bounds cleanly when variable or dataset changes
  useEffect(() => {
    const s = safeStd;
    setX1(Number((stats.mean - 0.5 * s).toFixed(1)));
    setX2(Number((stats.mean + 1.0 * s).toFixed(1)));
  }, [activeCol?.key, stats.n]);

  const z1 = (x1 - stats.mean) / safeStd;
  const z2 = (x2 - stats.mean) / safeStd;

  const probResult = useMemo(() => {
    if (mode === 'less') {
      return normalCDF(x1, stats.mean, safeStd);
    }
    if (mode === 'greater') {
      return 1 - normalCDF(x1, stats.mean, safeStd);
    }
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    return normalCDF(hi, stats.mean, safeStd) - normalCDF(lo, stats.mean, safeStd);
  }, [mode, x1, x2, stats.mean, safeStd]);

  // Empirical proportion from the actual 120 records for comparison!
  const empiricalMatch = useMemo(() => {
    if (values.length === 0) return { count: 0, pct: 0 };
    let count = 0;
    if (mode === 'less') {
      count = values.filter((v) => v <= x1).length;
    } else if (mode === 'greater') {
      count = values.filter((v) => v >= x1).length;
    } else {
      const lo = Math.min(x1, x2);
      const hi = Math.max(x1, x2);
      count = values.filter((v) => v >= lo && v <= hi).length;
    }
    return { count, pct: (count / values.length) * 100 };
  }, [values, mode, x1, x2]);

  const sliderMin = Number((stats.mean - 3.5 * safeStd).toFixed(1));
  const sliderMax = Number((stats.mean + 3.5 * safeStd).toFixed(1));
  const stepVal = Number(Math.max(0.1, safeStd / 25).toFixed(2));
  const unit = activeCol?.unit || '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#9E3E5D] mb-1">
            02. Modelo continuo
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#231A20] tracking-tight text-balance">
            Distribución Normal
          </h1>
          <p className="mt-2 text-sm text-[#5A4C53] max-w-2xl">
            Modela el comportamiento de cualquier variable numérica de la encuesta mediante sus parámetros reales y calcula probabilidades bajo la curva normal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs text-[#5A4C53]">
            <span>Variable numérica</span>
            <select
              value={activeCol?.key || ''}
              onChange={(e) => onSelectNumericKey(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white border border-[#DFD2CA] text-sm font-medium text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            >
              {numericCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 text-xs text-[#5A4C53]">
            <span>Desviación usada</span>
            <div className="flex items-center p-1 bg-[#F5EFEA] rounded-lg border border-[#EADFD9]">
              <button
                type="button"
                onClick={() => setStdType('sample')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  stdType === 'sample'
                    ? 'bg-white text-[#231A20] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Muestral (s)
              </button>
              <button
                type="button"
                onClick={() => setStdType('population')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  stdType === 'population'
                    ? 'bg-white text-[#231A20] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Poblacional (σ)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Parameters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Media (μ)', value: `${stats.mean.toFixed(2)} ${unit}` },
          {
            label: stdType === 'sample' ? 'Desv. estándar (s)' : 'Desv. estándar (σ)',
            value: `${activeStd.toFixed(2)} ${unit}`,
          },
          { label: 'Mediana', value: `${stats.median.toFixed(2)} ${unit}` },
          { label: 'Mínimo', value: `${stats.min.toFixed(1)} ${unit}` },
          { label: 'Máximo', value: `${stats.max.toFixed(1)} ${unit}` },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-[#EADFD9] rounded-xl p-4">
            <p className="text-xs text-[#7C6D75]">{item.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#231A20] tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Interactive Stage + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 bg-white border border-[#EADFD9] rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-[#5A4C53] mb-2">Tipo de probabilidad</p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5EFEA] rounded-lg border border-[#EADFD9]">
              <button
                type="button"
                onClick={() => setMode('less')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'less'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                P(X ≤ x)
              </button>
              <button
                type="button"
                onClick={() => setMode('greater')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'greater'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                P(X ≥ x)
              </button>
              <button
                type="button"
                onClick={() => setMode('between')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'between'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Intervalo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="normal-x1" className="font-medium text-[#231A20]">
                  {mode === 'between' ? 'Límite inferior (X₁)' : 'Valor objetivo (X)'}
                </label>
                <span className="font-mono text-[#62489A] tabular-nums">
                  Z₁ = {z1.toFixed(2)}
                </span>
              </div>
              <input
                id="normal-x1"
                type="number"
                step={stepVal}
                value={x1}
                onChange={(e) => setX1(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
              />
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={stepVal}
                value={Math.max(sliderMin, Math.min(sliderMax, x1))}
                onChange={(e) => setX1(Number(e.target.value))}
                className="w-full mt-2"
                aria-label="Deslizador para X1"
              />
            </div>

            {mode === 'between' && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="normal-x2" className="font-medium text-[#231A20]">
                    Límite superior (X₂)
                  </label>
                  <span className="font-mono text-[#62489A] tabular-nums">
                    Z₂ = {z2.toFixed(2)}
                  </span>
                </div>
                <input
                  id="normal-x2"
                  type="number"
                  step={stepVal}
                  value={x2}
                  onChange={(e) => setX2(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                />
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={stepVal}
                  value={Math.max(sliderMin, Math.min(sliderMax, x2))}
                  onChange={(e) => setX2(Number(e.target.value))}
                  className="w-full mt-2"
                  aria-label="Deslizador para X2"
                />
              </div>
            )}
          </div>

          {/* Result Summary */}
          <div className="pt-4 border-t border-[#EADFD9] space-y-3">
            <div>
              <p className="text-xs text-[#7C6D75]">Probabilidad teórica normal</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-3xl font-semibold text-[#9E3E5D] tabular-nums">
                  {(probResult * 100).toFixed(2)}%
                </span>
                <span className="font-mono text-sm text-[#5A4C53] tabular-nums">
                  ({probResult.toFixed(4)})
                </span>
              </div>
            </div>

            <div className="bg-[#F5EFEA] rounded-lg p-3 text-xs text-[#4A3F45] space-y-1">
              <div className="flex justify-between">
                <span>Frecuencia real en encuesta:</span>
                <span className="font-mono font-semibold text-[#231A20] tabular-nums">
                  {empiricalMatch.count}/{values.length} ({empiricalMatch.pct.toFixed(1)}%)
                </span>
              </div>
              <p className="text-[11px] text-[#7C6D75]">
                Compara el modelo teórico normal con los casos reales observados en la base de datos.
              </p>
            </div>
          </div>
        </div>

        {/* Bell Curve Chart + Step-by-Step Procedure */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                Curva normal · {activeCol?.label}
              </h2>
              <span className="text-xs font-mono text-[#62489A] tabular-nums">
                N(μ = {stats.mean.toFixed(2)}, σ = {safeStd.toFixed(2)})
              </span>
            </div>

            <NormalCurveChart
              mean={stats.mean}
              std={safeStd}
              mode={mode}
              x1={x1}
              x2={x2}
              unit={unit}
            />
          </div>

          {/* Step-by-step mathematical explanation */}
          <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
            <h3 className="font-display text-lg font-semibold text-[#231A20] mb-3">
              Procedimiento paso a paso
            </h3>
            <ol className="space-y-3 text-sm text-[#4A3F45]">
              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-[#9E3E5D] pt-0.5 shrink-0">
                  Paso 1
                </span>
                <div>
                  <span className="font-medium text-[#231A20]">Parámetros obtenidos de los {stats.n} encuestados:</span>{' '}
                  media <span className="font-mono tabular-nums">μ = {stats.mean.toFixed(2)} {unit}</span> y desviación estándar{' '}
                  <span className="font-mono tabular-nums">σ = {safeStd.toFixed(2)} {unit}</span>.
                </div>
              </li>

              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-[#9E3E5D] pt-0.5 shrink-0">
                  Paso 2
                </span>
                <div>
                  <span className="font-medium text-[#231A20]">Estandarización a puntuación Z:</span>{' '}
                  {mode !== 'between' ? (
                    <span className="font-mono text-xs bg-[#F5EFEA] px-2 py-0.5 rounded tabular-nums">
                      Z = ({x1.toFixed(2)} − {stats.mean.toFixed(2)}) / {safeStd.toFixed(2)} = {z1.toFixed(3)}
                    </span>
                  ) : (
                    <span className="font-mono text-xs bg-[#F5EFEA] px-2 py-0.5 rounded tabular-nums">
                      Z₁ = ({Math.min(x1, x2).toFixed(2)} − {stats.mean.toFixed(2)}) / {safeStd.toFixed(2)} ={' '}
                      {((Math.min(x1, x2) - stats.mean) / safeStd).toFixed(3)} · Z₂ ={' '}
                      {((Math.max(x1, x2) - stats.mean) / safeStd).toFixed(3)}
                    </span>
                  )}
                </div>
              </li>

              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-[#9E3E5D] pt-0.5 shrink-0">
                  Paso 3
                </span>
                <div>
                  <span className="font-medium text-[#231A20]">Cálculo del área bajo la curva:</span>{' '}
                  {mode === 'less' && (
                    <span>
                      Buscamos la probabilidad acumulada a la izquierda{' '}
                      <span className="font-mono tabular-nums">
                        P(Z ≤ {z1.toFixed(2)}) = Φ({z1.toFixed(2)}) = {probResult.toFixed(4)}
                      </span>
                      .
                    </span>
                  )}
                  {mode === 'greater' && (
                    <span>
                      Aplicamos la regla del complemento{' '}
                      <span className="font-mono tabular-nums">
                        P(Z ≥ {z1.toFixed(2)}) = 1 − Φ({z1.toFixed(2)}) = 1 −{' '}
                        {standardNormalCDF(z1).toFixed(4)} = {probResult.toFixed(4)}
                      </span>
                      .
                    </span>
                  )}
                  {mode === 'between' && (
                    <span>
                      Restamos las áreas acumuladas{' '}
                      <span className="font-mono tabular-nums">
                        Φ({Math.max(z1, z2).toFixed(2)}) − Φ({Math.min(z1, z2).toFixed(2)}) ={' '}
                        {standardNormalCDF(Math.max(z1, z2)).toFixed(4)} −{' '}
                        {standardNormalCDF(Math.min(z1, z2)).toFixed(4)} = {probResult.toFixed(4)}
                      </span>
                      .
                    </span>
                  )}
                </div>
              </li>

              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-[#9E3E5D] pt-0.5 shrink-0">
                  Paso 4
                </span>
                <div>
                  <span className="font-medium text-[#231A20]">Interpretación:</span> Bajo un modelo normal, aproximadamente el{' '}
                  <span className="font-mono font-semibold text-[#9E3E5D] tabular-nums">
                    {(probResult * 100).toFixed(2)}%
                  </span>{' '}
                  de los consumidores de belleza tendrían un valor de {activeCol?.label.toLowerCase()}{' '}
                  {mode === 'less'
                    ? `menor o igual a ${x1.toFixed(2)} ${unit}`
                    : mode === 'greater'
                    ? `mayor o igual a ${x1.toFixed(2)} ${unit}`
                    : `entre ${Math.min(x1, x2).toFixed(2)} y ${Math.max(x1, x2).toFixed(2)} ${unit}`}
                  .
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
