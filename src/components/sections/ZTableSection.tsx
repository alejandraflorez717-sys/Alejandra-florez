import React, { useMemo, useState } from 'react';
import { ColumnMeta, SurveyRecord } from '../../types/survey';
import {
  computeDescriptiveStats,
  getNumericValues,
  standardNormalCDF,
} from '../../utils/statsEngine';
import { NormalCurveChart } from '../charts/NormalCurveChart';

interface ZTableSectionProps {
  records: SurveyRecord[];
  columns: ColumnMeta[];
}

export const ZTableSection: React.FC<ZTableSectionProps> = ({ records, columns }) => {
  const numericCols = useMemo(
    () => columns.filter((c) => c.kind === 'numeric' && !c.isIdLike),
    [columns]
  );

  const [inputMode, setInputMode] = useState<'fromX' | 'directZ'>('fromX');
  const [tailMode, setTailMode] = useState<'less' | 'greater' | 'between'>('less');

  // Initialize from default survey gasto_mensual if available
  const defaultStats = useMemo(() => {
    const col = numericCols.find((c) => c.key === 'gasto_mensual') || numericCols[0];
    if (!col) return { mean: 50, std: 20 };
    const s = computeDescriptiveStats(getNumericValues(records, col.key));
    return {
      mean: Number(s.mean.toFixed(2)),
      std: Number((s.sampleStd || 1).toFixed(2)),
    };
  }, [records, numericCols]);

  const [xVal, setXVal] = useState<number>(60);
  const [xVal2, setXVal2] = useState<number>(75);
  const [meanVal, setMeanVal] = useState<number>(defaultStats.mean);
  const [stdVal, setStdVal] = useState<number>(defaultStats.std);

  const [directZ1, setDirectZ1] = useState<number>(1.25);
  const [directZ2, setDirectZ2] = useState<number>(1.96);

  const safeStd = stdVal > 0 ? stdVal : 1;

  const z1 = inputMode === 'fromX' ? (xVal - meanVal) / safeStd : directZ1;
  const z2 = inputMode === 'fromX' ? (xVal2 - meanVal) / safeStd : directZ2;

  const phi1 = standardNormalCDF(z1);
  const phi2 = standardNormalCDF(z2);

  const probability = useMemo(() => {
    if (tailMode === 'less') return phi1;
    if (tailMode === 'greater') return 1 - phi1;
    const lo = Math.min(z1, z2);
    const hi = Math.max(z1, z2);
    return standardNormalCDF(hi) - standardNormalCDF(lo);
  }, [tailMode, z1, z2, phi1]);

  // Interactive Z-table grid around z1
  const zTarget = tailMode === 'between' ? z2 : z1;
  const clampedZForTable = Math.max(-3.49, Math.min(3.49, zTarget));
  const rowBase = Number((Math.trunc(clampedZForTable * 10) / 10).toFixed(1));
  const colHundredth = Math.min(
    9,
    Math.max(0, Math.round(Math.abs(clampedZForTable * 100) % 10))
  );

  // Build 7 rows centered around rowBase
  const tableRows = useMemo(() => {
    const rows: number[] = [];
    const startTenths = Math.round(rowBase * 10) - 3;
    for (let i = 0; i < 7; i++) {
      const val = (startTenths + i) / 10;
      if (val >= -3.4 && val <= 3.4) {
        rows.push(Number(val.toFixed(1)));
      }
    }
    return rows;
  }, [rowBase]);

  const hundredthsCols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const loadSurveyParams = (key: string) => {
    const vals = getNumericValues(records, key);
    const s = computeDescriptiveStats(vals);
    const m = Number(s.mean.toFixed(2));
    const sd = Number((s.sampleStd || 1).toFixed(2));
    setMeanVal(m);
    setStdVal(sd);
    setXVal(Number((m + 0.8 * sd).toFixed(2)));
    setXVal2(Number((m + 1.5 * sd).toFixed(2)));
    setInputMode('fromX');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#9E3E5D] mb-1">
            05. Distribución normal estándar N(0, 1)
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#231A20] tracking-tight text-balance">
            Tabla Z Interactiva
          </h1>
          <p className="mt-2 text-sm text-[#5A4C53] max-w-2xl">
            Calcula puntuaciones Z a partir de X, media y desviación estándar —o ingresa un valor Z directo— para consultar su probabilidad acumulada y área bajo la curva.
          </p>
        </div>

        {/* Quick presets from real 120-record survey */}
        {numericCols.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#7C6D75]">Cargar μ y s de la encuesta:</span>
            {numericCols.slice(0, 3).map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => loadSurveyParams(col.key)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#DFD2CA] text-[#231A20] hover:bg-[#F5EFEA] transition-colors whitespace-nowrap"
              >
                {col.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calculator Controls */}
        <div className="lg:col-span-4 bg-white border border-[#EADFD9] rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-[#5A4C53] mb-2">Modo de entrada</p>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5EFEA] rounded-lg border border-[#EADFD9]">
              <button
                type="button"
                onClick={() => setInputMode('fromX')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  inputMode === 'fromX'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Desde X, μ y σ
              </button>
              <button
                type="button"
                onClick={() => setInputMode('directZ')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  inputMode === 'directZ'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Valor Z directo
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#5A4C53] mb-2">Área a calcular</p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5EFEA] rounded-lg border border-[#EADFD9]">
              <button
                type="button"
                onClick={() => setTailMode('less')}
                className={`py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tailMode === 'less'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Izquierda (≤)
              </button>
              <button
                type="button"
                onClick={() => setTailMode('greater')}
                className={`py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tailMode === 'greater'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Derecha (≥)
              </button>
              <button
                type="button"
                onClick={() => setTailMode('between')}
                className={`py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tailMode === 'between'
                    ? 'bg-white text-[#9E3E5D] shadow-xs'
                    : 'text-[#5A4C53] hover:text-[#231A20]'
                }`}
              >
                Entre dos
              </button>
            </div>
          </div>

          {inputMode === 'fromX' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs">
                  <span className="font-medium text-[#231A20]">Media (μ)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={meanVal}
                    onChange={(e) => setMeanVal(Number(e.target.value) || 0)}
                    className="mt-1 w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                  />
                </label>

                <label className="block text-xs">
                  <span className="font-medium text-[#231A20]">Desv. estándar (σ)</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={stdVal}
                    onChange={(e) => setStdVal(Math.max(0.01, Number(e.target.value) || 1))}
                    className="mt-1 w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                  />
                </label>
              </div>

              <label className="block text-xs">
                <span className="font-medium text-[#231A20]">
                  {tailMode === 'between' ? 'Valor X₁ (límite 1)' : 'Valor X'}
                </span>
                <input
                  type="number"
                  step={0.5}
                  value={xVal}
                  onChange={(e) => setXVal(Number(e.target.value) || 0)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                />
              </label>

              {tailMode === 'between' && (
                <label className="block text-xs">
                  <span className="font-medium text-[#231A20]">Valor X₂ (límite 2)</span>
                  <input
                    type="number"
                    step={0.5}
                    value={xVal2}
                    onChange={(e) => setXVal2(Number(e.target.value) || 0)}
                    className="mt-1 w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="direct-z1" className="font-medium text-[#231A20]">
                    {tailMode === 'between' ? 'Valor Z₁' : 'Valor Z'}
                  </label>
                  <span className="font-mono text-[#62489A] tabular-nums">
                    Φ(Z₁) = {phi1.toFixed(4)}
                  </span>
                </div>
                <input
                  id="direct-z1"
                  type="number"
                  step={0.01}
                  min={-4}
                  max={4}
                  value={directZ1}
                  onChange={(e) => setDirectZ1(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                />
                <input
                  type="range"
                  min={-3.4}
                  max={3.4}
                  step={0.01}
                  value={Math.max(-3.4, Math.min(3.4, directZ1))}
                  onChange={(e) => setDirectZ1(Number(e.target.value))}
                  className="w-full mt-2"
                  aria-label="Deslizador para Z1"
                />
              </div>

              {tailMode === 'between' && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label htmlFor="direct-z2" className="font-medium text-[#231A20]">
                      Valor Z₂
                    </label>
                    <span className="font-mono text-[#62489A] tabular-nums">
                      Φ(Z₂) = {phi2.toFixed(4)}
                    </span>
                  </div>
                  <input
                    id="direct-z2"
                    type="number"
                    step={0.01}
                    min={-4}
                    max={4}
                    value={directZ2}
                    onChange={(e) => setDirectZ2(Number(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg bg-[#FCF9F6] border border-[#DFD2CA] font-mono text-sm text-[#231A20] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
                  />
                  <input
                    type="range"
                    min={-3.4}
                    max={3.4}
                    step={0.01}
                    value={Math.max(-3.4, Math.min(3.4, directZ2))}
                    onChange={(e) => setDirectZ2(Number(e.target.value))}
                    className="w-full mt-2"
                    aria-label="Deslizador para Z2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Output Metrics */}
          <div className="pt-4 border-t border-[#EADFD9] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F5EFEA] rounded-lg p-3">
                <p className="text-[11px] text-[#7C6D75]">
                  {tailMode === 'between' ? 'Puntuaciones Z' : 'Puntuación Z'}
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#62489A] tabular-nums">
                  {tailMode === 'between'
                    ? `${z1.toFixed(2)} y ${z2.toFixed(2)}`
                    : z1.toFixed(3)}
                </p>
              </div>
              <div className="bg-[#F5EFEA] rounded-lg p-3">
                <p className="text-[11px] text-[#7C6D75]">Acumulada Φ(Z)</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#231A20] tabular-nums">
                  {phi1.toFixed(4)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#7C6D75]">Probabilidad resultante</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-3xl font-semibold text-[#9E3E5D] tabular-nums">
                  {(probability * 100).toFixed(2)}%
                </span>
                <span className="font-mono text-sm text-[#5A4C53] tabular-nums">
                  ({probability.toFixed(4)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Standard Normal Curve & Explanation */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="font-display text-xl font-semibold text-[#231A20]">
                Curva normal estándar N(0, 1)
              </h2>
              <span className="text-xs font-mono text-[#62489A] tabular-nums">
                {tailMode === 'less'
                  ? `P(Z ≤ ${z1.toFixed(2)}) = ${probability.toFixed(4)}`
                  : tailMode === 'greater'
                  ? `P(Z ≥ ${z1.toFixed(2)}) = ${probability.toFixed(4)}`
                  : `P(${Math.min(z1, z2).toFixed(2)} ≤ Z ≤ ${Math.max(z1, z2).toFixed(2)}) = ${probability.toFixed(4)}`}
              </span>
            </div>

            <NormalCurveChart
              mean={0}
              std={1}
              mode={tailMode}
              x1={z1}
              x2={z2}
              isStandardZ
            />
          </div>

          {/* Simple Explanation */}
          <div className="bg-white border border-[#EADFD9] rounded-xl p-6 space-y-3 text-sm text-[#4A3F45]">
            <h3 className="font-display text-lg font-semibold text-[#231A20]">
              ¿Cómo se obtiene este resultado?
            </h3>
            {inputMode === 'fromX' && (
              <p>
                <strong className="text-[#231A20]">1. Estandarización:</strong> Restamos la media al valor X y dividimos entre la desviación estándar para saber a cuántas desviaciones está del centro:{' '}
                <span className="font-mono text-xs bg-[#F5EFEA] px-2 py-0.5 rounded tabular-nums">
                  Z = ({xVal} − {meanVal}) / {safeStd} = {z1.toFixed(3)}
                </span>
                .
              </p>
            )}
            <p>
              <strong className="text-[#231A20]">{inputMode === 'fromX' ? '2.' : '1.'} Lectura acumulada Φ(Z):</strong>{' '}
              La tabla Z entrega siempre el área a la izquierda desde −∞ hasta Z. Para{' '}
              <span className="font-mono tabular-nums">Z = {z1.toFixed(2)}</span>, el área acumulada es{' '}
              <span className="font-mono font-semibold text-[#231A20] tabular-nums">
                Φ({z1.toFixed(2)}) = {phi1.toFixed(4)}
              </span>{' '}
              ({(phi1 * 100).toFixed(2)}%).
            </p>
            <p>
              <strong className="text-[#231A20]">{inputMode === 'fromX' ? '3.' : '2.'} Área solicitada:</strong>{' '}
              {tailMode === 'less' &&
                'Al pedir la probabilidad a la izquierda, tomamos directamente Φ(Z).'}
              {tailMode === 'greater' &&
                `Al pedir la probabilidad a la derecha, restamos al área total (1): 1 − ${phi1.toFixed(4)} = ${probability.toFixed(4)}.`}
              {tailMode === 'between' &&
                `Para el área entre dos valores, restamos el área menor al área mayor: Φ(${Math.max(z1, z2).toFixed(2)}) − Φ(${Math.min(z1, z2).toFixed(2)}) = ${probability.toFixed(4)}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Z-Table Reference Slice */}
      <div className="bg-white border border-[#EADFD9] rounded-xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#231A20]">
              Tabla Z acumulada interactiva Φ(z)
            </h2>
            <p className="text-xs text-[#7C6D75] mt-0.5">
              Haz clic en cualquier celda para cargar ese valor Z directamente · Fila resaltada para z ≈ {clampedZForTable.toFixed(2)}
            </p>
          </div>
          <span className="text-xs font-mono text-[#9E3E5D] tabular-nums">
            Fila {rowBase.toFixed(1)} · Columna .0{colHundredth}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-[#EADFD9] bg-[#FCF9F6] text-[#5A4C53]">
                <th className="py-2 px-3 text-left font-semibold">Z</th>
                {hundredthsCols.map((c) => (
                  <th
                    key={c}
                    className={`py-2 px-2 text-center font-semibold ${
                      c === colHundredth ? 'text-[#9E3E5D] bg-[#FDF4F7]' : ''
                    }`}
                  >
                    .0{c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9E4]">
              {tableRows.map((r) => {
                const isActiveRow = Math.abs(r - rowBase) < 0.05;
                return (
                  <tr key={r} className={isActiveRow ? 'bg-[#FCF6F8]' : ''}>
                    <td
                      className={`py-2 px-3 font-semibold ${
                        isActiveRow ? 'text-[#9E3E5D]' : 'text-[#231A20]'
                      }`}
                    >
                      {r.toFixed(1)}
                    </td>
                    {hundredthsCols.map((c) => {
                      const cellZ = r >= 0 ? r + c * 0.01 : r - c * 0.01;
                      const cellProb = standardNormalCDF(cellZ);
                      const isActiveCell = isActiveRow && c === colHundredth;
                      return (
                        <td key={c} className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setInputMode('directZ');
                              setDirectZ1(Number(cellZ.toFixed(2)));
                            }}
                            className={`w-full py-1.5 px-1 rounded transition-colors ${
                              isActiveCell
                                ? 'bg-[#C85A7C] text-white font-semibold'
                                : 'text-[#4A3F45] hover:bg-[#EFEAF8] hover:text-[#231A20]'
                            }`}
                            title={`Z = ${cellZ.toFixed(2)} → Φ(Z) = ${cellProb.toFixed(4)}`}
                          >
                            {cellProb.toFixed(4)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
