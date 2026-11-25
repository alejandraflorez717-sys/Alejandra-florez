import React, { useMemo, useState } from 'react';
import { ColumnMeta, SurveyRecord } from '../../types/survey';
import {
  computeDescriptiveStats,
  computeFrequencies,
  computeHistogram,
  getNumericValues,
} from '../../utils/statsEngine';
import { CategoryBarChart } from '../charts/CategoryBarChart';
import { HistogramChart } from '../charts/HistogramChart';

interface OverviewPanelProps {
  records: SurveyRecord[];
  columns: ColumnMeta[];
  selectedNumericKey: string;
  onSelectNumericKey: (key: string) => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  records,
  columns,
  selectedNumericKey,
  onSelectNumericKey,
}) => {
  const numericCols = useMemo(
    () => columns.filter((c) => c.kind === 'numeric' && !c.isIdLike),
    [columns]
  );
  const categoricalCols = useMemo(
    () => columns.filter((c) => c.kind === 'categorical' || c.kind === 'binary'),
    [columns]
  );

  const [selectedCatKey, setSelectedCatKey] = useState<string>(() => {
    return (
      categoricalCols.find((c) => c.key === 'categoria_preferida')?.key ||
      categoricalCols[0]?.key ||
      ''
    );
  });

  const [secondaryCatKey, setSecondaryCatKey] = useState<string>(() => {
    return (
      categoricalCols.find((c) => c.key === 'canal_compra')?.key ||
      categoricalCols[1]?.key ||
      categoricalCols[0]?.key ||
      ''
    );
  });

  // Ensure selected categorical keys remain valid when dataset changes
  const activeCatKey = categoricalCols.some((c) => c.key === selectedCatKey)
    ? selectedCatKey
    : categoricalCols[0]?.key || '';

  const activeSecondaryCatKey = categoricalCols.some((c) => c.key === secondaryCatKey)
    ? secondaryCatKey
    : categoricalCols[1]?.key || categoricalCols[0]?.key || '';

  const activeNumericCol = numericCols.find((c) => c.key === selectedNumericKey) || numericCols[0];

  const numericValues = useMemo(
    () => (activeNumericCol ? getNumericValues(records, activeNumericCol.key) : []),
    [records, activeNumericCol]
  );

  const stats = useMemo(() => computeDescriptiveStats(numericValues), [numericValues]);
  const histogramBins = useMemo(() => computeHistogram(numericValues), [numericValues]);

  const primaryFreqs = useMemo(
    () => (activeCatKey ? computeFrequencies(records, activeCatKey) : []),
    [records, activeCatKey]
  );

  const secondaryFreqs = useMemo(
    () => (activeSecondaryCatKey ? computeFrequencies(records, activeSecondaryCatKey) : []),
    [records, activeSecondaryCatKey]
  );

  // Highlight binary indicator (e.g. compra_mensual) for general survey KPI
  const binaryCol = useMemo(
    () => columns.find((c) => c.kind === 'binary'),
    [columns]
  );
  const binaryTopStat = useMemo(() => {
    if (!binaryCol) return null;
    const freqs = computeFrequencies(records, binaryCol.key);
    const positive =
      freqs.find((f) => /^(sí|si|yes|true|1|compra)$/i.test(f.label)) || freqs[0];
    return { col: binaryCol, item: positive };
  }, [binaryCol, records]);

  // Age or secondary numeric indicator
  const secondaryNumericCol = useMemo(() => {
    return (
      numericCols.find((c) => c.key !== activeNumericCol?.key && c.key === 'productos_rutina') ||
      numericCols.find((c) => c.key !== activeNumericCol?.key)
    );
  }, [numericCols, activeNumericCol]);

  const secondaryNumStats = useMemo(() => {
    if (!secondaryNumericCol) return null;
    return computeDescriptiveStats(getNumericValues(records, secondaryNumericCol.key));
  }, [records, secondaryNumericCol]);

  const unit = activeNumericCol?.unit || '';

  return (
    <div className="space-y-8">
      {/* Header & Variable Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#9E3E5D] mb-1">
            01. Panel principal de la encuesta
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#231A20] tracking-tight text-balance">
            Hábitos de consumo en productos de belleza
          </h1>
          <p className="mt-2 text-sm text-[#5A4C53] max-w-2xl">
            Resumen descriptivo, distribución de frecuencias e indicadores calculados directamente sobre los{' '}
            <span className="font-mono font-medium text-[#231A20] tabular-nums">{records.length}</span> registros reales disponibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {numericCols.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-[#5A4C53]">
              <span>Variable numérica</span>
              <select
                value={activeNumericCol?.key || ''}
                onChange={(e) => onSelectNumericKey(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-[#DFD2CA] text-sm font-medium text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
              >
                {numericCols.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {categoricalCols.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-[#5A4C53]">
              <span>Variable categórica</span>
              <select
                value={activeCatKey}
                onChange={(e) => setSelectedCatKey(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-[#DFD2CA] text-sm font-medium text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
              >
                {categoricalCols.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EADFD9] rounded-xl p-5">
          <p className="text-xs text-[#7C6D75]">Total de encuestados</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#231A20] tabular-nums">
            {records.length}
          </p>
          <p className="mt-1 text-xs text-[#5A4C53]">
            {columns.length} columnas analizadas
          </p>
        </div>

        <div className="bg-white border border-[#EADFD9] rounded-xl p-5">
          <p className="text-xs text-[#7C6D75]">
            Media · {activeNumericCol?.label || 'Variable'}
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#9E3E5D] tabular-nums">
            {stats.mean.toFixed(2)}
            {unit ? <span className="text-base ml-1 font-normal">{unit}</span> : null}
          </p>
          <p className="mt-1 text-xs text-[#5A4C53] font-mono tabular-nums">
            Mediana: {stats.median.toFixed(2)} · s = {stats.sampleStd.toFixed(2)}
          </p>
        </div>

        <div className="bg-white border border-[#EADFD9] rounded-xl p-5">
          <p className="text-xs text-[#7C6D75]">
            {binaryTopStat
              ? `${binaryTopStat.col.label} (${binaryTopStat.item?.label})`
              : `Categoría líder · ${categoricalCols.find((c) => c.key === activeCatKey)?.label || ''}`}
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#62489A] tabular-nums">
            {binaryTopStat && binaryTopStat.item
              ? `${binaryTopStat.item.percent.toFixed(1)}%`
              : primaryFreqs[0]
              ? `${primaryFreqs[0].percent.toFixed(1)}%`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-[#5A4C53] font-mono tabular-nums">
            {binaryTopStat && binaryTopStat.item
              ? `${binaryTopStat.item.count} de ${records.length} encuestados`
              : primaryFreqs[0]
              ? `${primaryFreqs[0].label} (${primaryFreqs[0].count})`
              : ''}
          </p>
        </div>

        <div className="bg-white border border-[#EADFD9] rounded-xl p-5">
          <p className="text-xs text-[#7C6D75]">
            {secondaryNumericCol
              ? `Promedio · ${secondaryNumericCol.label}`
              : 'Rango de valores'}
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#231A20] tabular-nums">
            {secondaryNumStats
              ? secondaryNumStats.mean.toFixed(2)
              : stats.range.toFixed(2)}
            {secondaryNumericCol?.unit ? (
              <span className="text-base ml-1 font-normal">{secondaryNumericCol.unit}</span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[#5A4C53] font-mono tabular-nums">
            {secondaryNumStats
              ? `Mín ${secondaryNumStats.min.toFixed(1)} · Máx ${secondaryNumStats.max.toFixed(1)}`
              : `Mín ${stats.min.toFixed(1)} · Máx ${stats.max.toFixed(1)}`}
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Numeric Histogram + Normal fit */}
        <div className="lg:col-span-7 bg-white border border-[#EADFD9] rounded-xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                Distribución de {activeNumericCol?.label || 'variable numérica'}
              </h2>
              <p className="text-xs text-[#7C6D75] mt-0.5">
                Histograma real con curva normal de referencia (N = {stats.n})
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#62489A]">
              Rango: [{stats.min.toFixed(1)}, {stats.max.toFixed(1)}] {unit}
            </span>
          </div>

          <HistogramChart
            bins={histogramBins}
            mean={stats.mean}
            std={stats.sampleStd}
            totalCount={stats.n}
            unit={unit}
          />
        </div>

        {/* Categorical Preferences */}
        <div className="lg:col-span-5 bg-white border border-[#EADFD9] rounded-xl p-6">
          <div className="flex items-baseline justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                {categoricalCols.find((c) => c.key === activeCatKey)?.label || 'Preferencias'}
              </h2>
              <p className="text-xs text-[#7C6D75] mt-0.5">
                Frecuencia observada por categoría
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#7C6D75]">
              {primaryFreqs.length} categorías
            </span>
          </div>

          {primaryFreqs.length > 0 ? (
            <CategoryBarChart items={primaryFreqs} total={records.length} />
          ) : (
            <p className="text-sm text-[#7C6D75]">No hay variables categóricas disponibles.</p>
          )}
        </div>
      </div>

      {/* Descriptive Statistics Table + Secondary Habits Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full Descriptive Stats */}
        <div className="lg:col-span-5 bg-white border border-[#EADFD9] rounded-xl p-6">
          <h2 className="font-display text-xl font-semibold text-[#231A20]">
            Estadísticos descriptivos
          </h2>
          <p className="text-xs text-[#7C6D75] mt-0.5 mb-4">
            Calculados sobre {activeNumericCol?.label} (N = {stats.n})
          </p>

          <div className="divide-y divide-[#F2E9E4] text-sm">
            {[
              ['Media aritmética (x̄)', `${stats.mean.toFixed(3)} ${unit}`],
              ['Mediana (Q₂)', `${stats.median.toFixed(3)} ${unit}`],
              [
                'Moda',
                stats.modes.length > 0
                  ? stats.modes.slice(0, 3).map((m) => m.toFixed(1)).join(', ')
                  : 'Sin moda única',
              ],
              ['Desv. estándar muestral (s)', `${stats.sampleStd.toFixed(3)} ${unit}`],
              ['Desv. estándar poblacional (σ)', `${stats.popStd.toFixed(3)} ${unit}`],
              ['Varianza muestral (s²)', stats.sampleVariance.toFixed(3)],
              ['Mínimo / Máximo', `${stats.min.toFixed(1)} / ${stats.max.toFixed(1)} ${unit}`],
              ['Cuartiles (Q₁ · Q₃ · IQR)', `${stats.q1.toFixed(1)} · ${stats.q3.toFixed(1)} · ${stats.iqr.toFixed(1)}`],
              ['Coeficiente de asimetría', stats.skewness.toFixed(3)],
            ].map(([label, val]) => (
              <div key={label} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-[#5A4C53]">{label}</span>
                <span className="font-mono font-medium text-[#231A20] tabular-nums text-right">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Frequency Table + Secondary Categorical Selector */}
        <div className="lg:col-span-7 bg-white border border-[#EADFD9] rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                Tabla de frecuencias y hábitos
              </h2>
              <p className="text-xs text-[#7C6D75] mt-0.5">
                Distribución absoluta, relativa y acumulada
              </p>
            </div>

            {categoricalCols.length > 1 && (
              <select
                value={activeSecondaryCatKey}
                onChange={(e) => setSecondaryCatKey(e.target.value)}
                aria-label="Seleccionar segunda variable categórica"
                className="h-9 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] text-xs font-medium text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#7B61B3]/40"
              >
                {categoricalCols.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EADFD9] text-left text-xs text-[#7C6D75]">
                  <th className="py-2.5 pr-4 font-medium">Categoría</th>
                  <th className="py-2.5 px-3 font-medium text-right">Frec. (fᵢ)</th>
                  <th className="py-2.5 px-3 font-medium text-right">Relativa (%)</th>
                  <th className="py-2.5 px-3 font-medium text-right">Acum. (Fᵢ)</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Acum. (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E9E4]">
                {secondaryFreqs.map((row) => (
                  <tr key={row.label} className="hover:bg-[#FCF9F6] transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-[#231A20]">{row.label}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#231A20]">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#9E3E5D]">
                      {row.percent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#5A4C53]">
                      {row.cumulativeCount}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-[#62489A]">
                      {row.cumulativePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
