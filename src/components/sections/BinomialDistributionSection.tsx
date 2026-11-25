import React, { useEffect, useMemo, useState } from 'react';
import { ColumnMeta, SurveyRecord } from '../../types/survey';
import {
  binomialCDF,
  binomialPMF,
  binomialUpperTail,
  computeFrequencies,
} from '../../utils/statsEngine';
import { BinomialChart } from '../charts/BinomialChart';

interface BinomialDistributionSectionProps {
  records: SurveyRecord[];
  columns: ColumnMeta[];
}

export const BinomialDistributionSection: React.FC<BinomialDistributionSectionProps> = ({
  records,
  columns,
}) => {
  const eligibleCols = useMemo(
    () => columns.filter((c) => c.kind === 'binary' || c.kind === 'categorical'),
    [columns]
  );

  const [selectedColKey, setSelectedColKey] = useState<string>(() => {
    return (
      eligibleCols.find((c) => c.kind === 'binary')?.key ||
      eligibleCols[0]?.key ||
      ''
    );
  });

  const activeCol =
    eligibleCols.find((c) => c.key === selectedColKey) ||
    eligibleCols.find((c) => c.kind === 'binary') ||
    eligibleCols[0];

  const freqs = useMemo(
    () => (activeCol ? computeFrequencies(records, activeCol.key) : []),
    [records, activeCol]
  );

  const [successLabel, setSuccessLabel] = useState<string>(() => {
    const positive = freqs.find((f) => /^(sí|si|yes|true|1|compra)$/i.test(f.label));
    return positive?.label || freqs[0]?.label || '';
  });

  useEffect(() => {
    if (!freqs.some((f) => f.label === successLabel)) {
      const positive = freqs.find((f) => /^(sí|si|yes|true|1|compra)$/i.test(f.label));
      setSuccessLabel(positive?.label || freqs[0]?.label || '');
    }
  }, [freqs, successLabel]);

  const surveySuccessItem = freqs.find((f) => f.label === successLabel) || freqs[0];
  const surveyP = surveySuccessItem ? Number(surveySuccessItem.relative.toFixed(4)) : 0.5;

  const [n, setN] = useState<number>(15);
  const [p, setP] = useState<number>(surveyP);
  const [k, setK] = useState<number>(10);
  const [mode, setMode] = useState<'exact' | 'atMost' | 'atLeast'>('exact');

  // Update p automatically when user switches survey variable or success category
  useEffect(() => {
    setP(surveyP);
  }, [surveyP]);

  // Clamp k within [0, n]
  const safeN = Math.max(1, Math.min(100, Math.round(n)));
  const safeK = Math.max(0, Math.min(safeN, Math.round(k)));
  const safeP = Math.max(0.0001, Math.min(0.9999, p));

  const probExact = useMemo(() => binomialPMF(safeN, safeK, safeP), [safeN, safeK, safeP]);
  const probAtMost = useMemo(() => binomialCDF(safeN, safeK, safeP), [safeN, safeK, safeP]);
  const probAtLeast = useMemo(
    () => binomialUpperTail(safeN, safeK, safeP),
    [safeN, safeK, safeP]
  );

  const activeProb =
    mode === 'exact' ? probExact : mode === 'atMost' ? probAtMost : probAtLeast;

  const expectedMean = safeN * safeP;
  const binomialStd = Math.sqrt(safeN * safeP * (1 - safeP));

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#9E3E5D] mb-1">
            03. Modelo discreto de éxitos
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#231A20] tracking-tight text-balance">
            Distribución Binomial
          </h1>
          <p className="mt-2 text-sm text-[#5A4C53] max-w-2xl">
            Analiza eventos dicotómicos (éxito vs. fracaso) derivados directamente de la encuesta y calcula probabilidades para grupos de consumidores.
          </p>
        </div>

        {eligibleCols.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#5A4C53]">
              <span>Variable de la encuesta</span>
              <select
                value={activeCol?.key || ''}
                onChange={(e) => setSelectedColKey(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-[#DFD2CA] text-sm font-medium text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
              >
                {eligibleCols.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} ({col.kind === 'binary' ? 'Dicotómica' : `${col.uniqueCount} opciones`})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-[#5A4C53]">
              <span>Resultado considerado “Éxito”</span>
              <select
                value={successLabel}
                onChange={(e) => setSuccessLabel(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-[#DFD2CA] text-sm font-medium text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
              >
                {freqs.map((f) => (
                  <option key={f.label} value={f.label}>
                    {f.label} ({f.count}/{records.length} · {f.percent.toFixed(1)}%)
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Real Proportion Reference Banner */}
      {surveySuccessItem && (
        <div className="bg-[#F5EFEA] border border-[#EADFD9] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#4A3F45]">
            En la base de datos de <span className="font-mono font-semibold text-[#231A20]">{records.length}</span> encuestados,{' '}
            <span className="font-mono font-semibold text-[#9E3E5D]">{surveySuccessItem.count}</span>{' '}
            corresponden a <span className="font-medium text-[#231A20]">“{surveySuccessItem.label}”</span> en{' '}
            <span className="font-medium text-[#231A20]">{activeCol?.label}</span>, lo que arroja una proporción real de{' '}
            <span className="font-mono font-semibold text-[#62489A] tabular-nums">
              p = {surveyP.toFixed(4)} ({(surveyP * 100).toFixed(2)}%)
            </span>
            .
          </div>

          {Math.abs(p - surveyP) > 0.0005 && (
            <button
              type="button"
              onClick={() => setP(surveyP)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-[#DFD2CA] text-[#231A20] hover:bg-[#FCF9F6] transition-colors whitespace-nowrap shrink-0"
            >
              Restaurar p real ({surveyP.toFixed(3)})
            </button>
          )}
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls */}
        <div className="lg:col-span-4 bg-white border border-[#EADFD9] rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="bin-n" className="font-medium text-[#231A20]">
                Número de personas (n)
              </label>
              <span className="font-mono text-[#7C6D75] tabular-nums">1 a 100</span>
            </div>
            <input
              id="bin-n"
              type="number"
              min={1}
              max={100}
              value={safeN}
              onChange={(e) => {
                const nextN = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                setN(nextN);
                if (safeK > nextN) setK(nextN);
              }}
              className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            />
            <input
              type="range"
              min={1}
              max={60}
              value={Math.min(60, safeN)}
              onChange={(e) => {
                const nextN = Number(e.target.value);
                setN(nextN);
                if (safeK > nextN) setK(nextN);
              }}
              className="w-full mt-2"
              aria-label="Deslizador para n"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="bin-p" className="font-medium text-[#231A20]">
                Probabilidad de éxito (p)
              </label>
              <span className="font-mono text-[#62489A] tabular-nums">
                {(safeP * 100).toFixed(1)}%
              </span>
            </div>
            <input
              id="bin-p"
              type="number"
              min={0.01}
              max={0.99}
              step={0.01}
              value={p}
              onChange={(e) => setP(Math.max(0.001, Math.min(0.999, Number(e.target.value) || 0.5)))}
              className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            />
            <input
              type="range"
              min={0.01}
              max={0.99}
              step={0.01}
              value={safeP}
              onChange={(e) => setP(Number(e.target.value))}
              className="w-full mt-2"
              aria-label="Deslizador para p"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="bin-k" className="font-medium text-[#231A20]">
                Éxitos deseados (k)
              </label>
              <span className="font-mono text-[#9E3E5D] tabular-nums">
                0 ≤ k ≤ {safeN}
              </span>
            </div>
            <input
              id="bin-k"
              type="number"
              min={0}
              max={safeN}
              value={safeK}
              onChange={(e) => setK(Math.max(0, Math.min(safeN, Number(e.target.value) || 0)))}
              className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            />
            <input
              type="range"
              min={0}
              max={safeN}
              value={safeK}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-full mt-2"
              aria-label="Deslizador para k"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[#5A4C53] mb-2">Evento a resaltar</p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5EFEA] rounded-lg border border-[#EADFD9]">
              <button
                type="button"
                onClick={() => setMode('exact')}
                className={`py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'exact'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Exacto (=)
              </button>
              <button
                type="button"
                onClick={() => setMode('atMost')}
                className={`py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'atMost'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Máximo (≤)
              </button>
              <button
                type="button"
                onClick={() => setMode('atLeast')}
                className={`py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'atLeast'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Mínimo (≥)
              </button>
            </div>
          </div>
        </div>

        {/* Chart & Probability Results */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3 Probability Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setMode('exact')}
              className={`text-left rounded-xl p-4 border transition-colors ${
                mode === 'exact'
                  ? 'bg-[#FDF4F7] border-[#C85A7C]'
                  : 'bg-white border-[#EADFD9] hover:border-[#D9B6C2]'
              }`}
            >
              <p className="text-xs text-[#7C6D75]">Exactamente {safeK} éxitos · P(X = {safeK})</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#9E3E5D] tabular-nums">
                {(probExact * 100).toFixed(2)}%
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#5A4C53] tabular-nums">
                {probExact.toFixed(5)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('atMost')}
              className={`text-left rounded-xl p-4 border transition-colors ${
                mode === 'atMost'
                  ? 'bg-[#FDF4F7] border-[#C85A7C]'
                  : 'bg-white border-[#EADFD9] hover:border-[#D9B6C2]'
              }`}
            >
              <p className="text-xs text-[#7C6D75]">Como máximo {safeK} · P(X ≤ {safeK})</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#9E3E5D] tabular-nums">
                {(probAtMost * 100).toFixed(2)}%
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#5A4C53] tabular-nums">
                {probAtMost.toFixed(5)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('atLeast')}
              className={`text-left rounded-xl p-4 border transition-colors ${
                mode === 'atLeast'
                  ? 'bg-[#FDF4F7] border-[#C85A7C]'
                  : 'bg-white border-[#EADFD9] hover:border-[#D9B6C2]'
              }`}
            >
              <p className="text-xs text-[#7C6D75]">Como mínimo {safeK} · P(X ≥ {safeK})</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#9E3E5D] tabular-nums">
                {(probAtLeast * 100).toFixed(2)}%
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#5A4C53] tabular-nums">
                {probAtLeast.toFixed(5)}
              </p>
            </button>
          </div>

          <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                Función de probabilidad binomial B(n={safeN}, p={safeP.toFixed(3)})
              </h2>
              <span className="text-xs font-mono text-[#62489A] tabular-nums">
                μ = {expectedMean.toFixed(2)} · σ = {binomialStd.toFixed(2)}
              </span>
            </div>

            <BinomialChart n={safeN} p={safeP} k={safeK} mode={mode} />
          </div>

          {/* Mathematical Explanation */}
          <div className="bg-white border border-[#EADFD9] rounded-xl p-6 text-sm text-[#4A3F45] space-y-2.5">
            <h3 className="font-display text-lg font-semibold text-[#231A20]">
              Fórmula e interpretación
            </h3>
            <p className="font-mono text-xs bg-[#F5EFEA] px-3 py-2 rounded-lg border border-[#EADFD9] text-[#231A20] overflow-x-auto tabular-nums">
              P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ = C({safeN}, {safeK}) · ({safeP.toFixed(3)})^{safeK} · ({(1 - safeP).toFixed(3)})^{safeN - safeK} = {probExact.toFixed(5)}
            </p>
            <p>
              Si se seleccionan al azar <span className="font-mono font-semibold text-[#231A20]">{safeN}</span> personas con una probabilidad individual de{' '}
              <span className="font-mono font-semibold text-[#62489A]">{(safeP * 100).toFixed(1)}%</span> de cumplir con “{successLabel}”, se espera un promedio de{' '}
              <span className="font-mono font-semibold text-[#231A20]">{expectedMean.toFixed(2)}</span> éxitos (±{binomialStd.toFixed(2)}). La probabilidad de obtener{' '}
              {mode === 'exact'
                ? `exactamente ${safeK} éxitos`
                : mode === 'atMost'
                ? `como máximo ${safeK} éxitos`
                : `como mínimo ${safeK} éxitos`}{' '}
              es del <span className="font-mono font-semibold text-[#9E3E5D]">{(activeProb * 100).toFixed(2)}%</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
