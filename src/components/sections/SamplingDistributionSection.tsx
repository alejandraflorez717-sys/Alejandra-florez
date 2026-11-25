import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ColumnMeta, SampleDraw, SurveyRecord } from '../../types/survey';
import {
  computeDescriptiveStats,
  generateSamplingDistribution,
  getNumericValues,
} from '../../utils/statsEngine';
import { SamplingChart } from '../charts/SamplingChart';

interface SamplingDistributionSectionProps {
  records: SurveyRecord[];
  columns: ColumnMeta[];
  selectedNumericKey: string;
  onSelectNumericKey: (key: string) => void;
}

export const SamplingDistributionSection: React.FC<SamplingDistributionSectionProps> = ({
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

  const popValues = useMemo(
    () => (activeCol ? getNumericValues(records, activeCol.key) : []),
    [records, activeCol]
  );

  const popStats = useMemo(() => computeDescriptiveStats(popValues), [popValues]);
  const maxSampleSize = Math.max(2, popValues.length);

  const [sampleSize, setSampleSize] = useState<number>(15);
  const [numSamples, setNumSamples] = useState<number>(40);
  const [withReplacement, setWithReplacement] = useState<boolean>(false);
  const [generationSeed, setGenerationSeed] = useState<number>(1);
  const [samples, setSamples] = useState<SampleDraw[]>([]);

  const safeSampleSize = withReplacement
    ? Math.max(2, Math.min(80, Math.round(sampleSize)))
    : Math.max(2, Math.min(maxSampleSize, Math.round(sampleSize)));
  const safeNumSamples = Math.max(5, Math.min(200, Math.round(numSamples)));

  useEffect(() => {
    if (popValues.length === 0) {
      setSamples([]);
      return;
    }
    const generated = generateSamplingDistribution(
      popValues,
      safeSampleSize,
      safeNumSamples,
      withReplacement
    );
    setSamples(generated);
  }, [popValues, safeSampleSize, safeNumSamples, withReplacement, generationSeed]);

  const sampleMeans = useMemo(() => samples.map((s) => s.mean), [samples]);
  const samplingStats = useMemo(() => computeDescriptiveStats(sampleMeans), [sampleMeans]);

  // Theoretical standard error: sigma / sqrt(n) (and with finite population correction when without replacement)
  const fpc =
    !withReplacement && popValues.length > 1
      ? Math.sqrt(Math.max(0, (popValues.length - safeSampleSize) / (popValues.length - 1)))
      : 1;
  const theoreticalSEBase = popStats.popStd / Math.sqrt(safeSampleSize);
  const theoreticalSE = theoreticalSEBase * fpc;

  const diffMean = samplingStats.mean - popStats.mean;
  const diffPct = popStats.mean !== 0 ? (Math.abs(diffMean) / Math.abs(popStats.mean)) * 100 : 0;
  const unit = activeCol?.unit || '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#9E3E5D] mb-1">
            04. Teorema del límite central
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#231A20] tracking-tight text-balance">
            Distribución Muestral de Medias
          </h1>
          <p className="mt-2 text-sm text-[#5A4C53] max-w-2xl">
            Extrae muestras aleatorias reales de los {popValues.length} encuestados para observar cómo las medias muestrales convergen hacia la media general y calcular el error estándar.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
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

          <button
            type="button"
            onClick={() => setGenerationSeed((s) => s + 1)}
            className="h-10 px-4 rounded-lg bg-[#C85A7C] hover:bg-[#B2486A] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Generar nuevas muestras</span>
          </button>
        </div>
      </div>

      {/* Controls & Comparison Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-[#EADFD9] rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="samp-n" className="font-medium text-[#231A20]">
                Tamaño de cada muestra (n)
              </label>
              <span className="font-mono text-[#7C6D75] tabular-nums">
                máx {withReplacement ? 80 : maxSampleSize}
              </span>
            </div>
            <input
              id="samp-n"
              type="number"
              min={2}
              max={withReplacement ? 80 : maxSampleSize}
              value={safeSampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value) || 2)}
              className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            />
            <input
              type="range"
              min={2}
              max={Math.min(60, withReplacement ? 80 : maxSampleSize)}
              value={Math.min(60, safeSampleSize)}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="w-full mt-2"
              aria-label="Deslizador de tamaño de muestra"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="samp-m" className="font-medium text-[#231A20]">
                Cantidad de muestras (M)
              </label>
              <span className="font-mono text-[#7C6D75] tabular-nums">5 a 200</span>
            </div>
            <input
              id="samp-m"
              type="number"
              min={5}
              max={200}
              value={safeNumSamples}
              onChange={(e) => setNumSamples(Number(e.target.value) || 5)}
              className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            />
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={safeNumSamples}
              onChange={(e) => setNumSamples(Number(e.target.value))}
              className="w-full mt-2"
              aria-label="Deslizador de cantidad de muestras"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[#5A4C53] mb-2">Método de selección</p>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5EFEA] rounded-lg border border-[#EADFD9]">
              <button
                type="button"
                onClick={() => setWithReplacement(false)}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  !withReplacement
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Sin reemplazo
              </button>
              <button
                type="button"
                onClick={() => setWithReplacement(true)}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  withReplacement
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Con reemplazo
              </button>
            </div>
          </div>

          {/* Standard Error Formula Box */}
          <div className="pt-4 border-t border-[#EADFD9] space-y-2 text-xs text-[#4A3F45]">
            <p className="font-medium text-[#231A20]">Cálculo del error estándar</p>
            <p className="font-mono bg-[#F5EFEA] p-2.5 rounded-lg border border-[#EADFD9] tabular-nums">
              σₓ̄ = σ / √n = {popStats.popStd.toFixed(2)} / √{safeSampleSize} ={' '}
              {theoreticalSEBase.toFixed(3)} {unit}
            </p>
            {!withReplacement && (
              <p className="text-[11px] text-[#7C6D75] font-mono tabular-nums">
                Con factor de corrección por población finita (N={popValues.length}):{' '}
                <strong className="text-[#231A20]">{theoreticalSE.toFixed(3)} {unit}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Comparison KPIs + Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#7C6D75]">Media general (μ)</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#62489A] tabular-nums">
                {popStats.mean.toFixed(2)} {unit}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7C6D75]">N = {popStats.n} encuestados</p>
            </div>

            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#7C6D75]">Media de las muestras (x̄ₘ)</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#9E3E5D] tabular-nums">
                {samplingStats.mean.toFixed(2)} {unit}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7C6D75]">{samples.length} muestras</p>
            </div>

            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#7C6D75]">Diferencia |x̄ₘ − μ|</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#231A20] tabular-nums">
                {Math.abs(diffMean).toFixed(3)} {unit}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7C6D75] font-mono tabular-nums">
                Error relativo: {diffPct.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#7C6D75]">Error estándar (σₓ̄)</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#231A20] tabular-nums">
                {theoreticalSE.toFixed(3)} {unit}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7C6D75] font-mono tabular-nums">
                Empírico: {samplingStats.sampleStd.toFixed(3)} {unit}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                Distribución de las {samples.length} medias muestrales
              </h2>
              <span className="text-xs font-mono text-[#62489A] tabular-nums">
                n = {safeSampleSize} · M = {samples.length}
              </span>
            </div>

            <SamplingChart
              sampleMeans={sampleMeans}
              popMean={popStats.mean}
              meanOfSampleMeans={samplingStats.mean}
              theoreticalSE={theoreticalSE}
              unit={unit}
            />
          </div>
        </div>
      </div>

      {/* Generated Samples Table */}
      <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#231A20]">
              Tabla de resultados por muestra
            </h2>
            <p className="text-xs text-[#7C6D75] mt-0.5">
              Detalle de cada muestra aleatoria extraída de los {popValues.length} registros reales
            </p>
          </div>
          <span className="text-xs font-mono text-[#5A4C53] tabular-nums">
            Mostrando {samples.length} muestras (n = {safeSampleSize} c/u)
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto border border-[#EFE7E2] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#FCF9F6] sticky top-0 border-b border-[#EADFD9]">
              <tr className="text-left text-xs text-[#7C6D75]">
                <th className="py-2.5 px-4 font-medium">Muestra</th>
                <th className="py-2.5 px-3 font-medium">Primeros valores observados</th>
                <th className="py-2.5 px-3 font-medium text-right">Mín</th>
                <th className="py-2.5 px-3 font-medium text-right">Máx</th>
                <th className="py-2.5 px-3 font-medium text-right">Desv. (s)</th>
                <th className="py-2.5 px-3 font-medium text-right">Media (x̄ᵢ)</th>
                <th className="py-2.5 px-4 font-medium text-right">Dif. (x̄ᵢ − μ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9E4]">
              {samples.map((s) => (
                <tr key={s.sampleIndex} className="hover:bg-[#FCF9F6]">
                  <td className="py-2 px-4 font-mono text-xs font-medium text-[#231A20] tabular-nums">
                    #{s.sampleIndex}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-[#5A4C53] truncate max-w-xs tabular-nums">
                    {s.values
                      .slice(0, 5)
                      .map((v) => v.toFixed(1))
                      .join(', ')}
                    {s.values.length > 5 ? ` … (+${s.values.length - 5})` : ''}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-[#5A4C53] tabular-nums">
                    {s.min.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-[#5A4C53] tabular-nums">
                    {s.max.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-[#5A4C53] tabular-nums">
                    {s.sampleStd.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-[#9E3E5D] tabular-nums">
                    {s.mean.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs text-[#62489A] tabular-nums">
                    {s.diffFromPopMean >= 0 ? '+' : ''}
                    {s.diffFromPopMean.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
