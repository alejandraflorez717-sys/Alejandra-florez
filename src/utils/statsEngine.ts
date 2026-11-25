import {
  ColumnKind,
  ColumnMeta,
  DescriptiveStats,
  FrequencyItem,
  HistogramBin,
  SampleDraw,
  SurveyRecord,
} from '../types/survey';

const KNOWN_LABELS: Record<string, { label: string; unit?: string }> = {
  id: { label: 'ID Encuestado' },
  edad: { label: 'Edad', unit: 'años' },
  genero: { label: 'Género' },
  compra_mensual: { label: 'Compra Mensual' },
  gasto_mensual: { label: 'Gasto Mensual', unit: '$' },
  productos_rutina: { label: 'Productos en Rutina', unit: 'unid.' },
  categoria_preferida: { label: 'Categoría Preferida' },
  frecuencia_compra: { label: 'Frecuencia de Compra' },
  canal_compra: { label: 'Canal de Compra' },
  factor_decision: { label: 'Factor de Decisión' },
  satisfaccion: { label: 'Satisfacción (1-5)', unit: 'pts' },
};

export function humanizeColumnKey(key: string): string {
  if (KNOWN_LABELS[key]) return KNOWN_LABELS[key].label;
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function analyzeColumns(records: SurveyRecord[]): ColumnMeta[] {
  if (records.length === 0) return [];
  const keys = Object.keys(records[0]);

  return keys.map((key) => {
    const rawValues = records
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== '');

    const numericValues = rawValues.filter((v) => typeof v === 'number' && Number.isFinite(v)) as number[];
    const isNumeric = rawValues.length > 0 && numericValues.length >= rawValues.length * 0.85;

    const uniqueStrs = Array.from(new Set(rawValues.map((v) => String(v).trim())));
    const lowerKey = key.toLowerCase();
    const isIdLike =
      lowerKey === 'id' ||
      lowerKey === 'nro' ||
      lowerKey === 'num' ||
      lowerKey === 'index' ||
      (isNumeric &&
        uniqueStrs.length === records.length &&
        numericValues.every((v, idx) => idx === 0 || v === numericValues[idx - 1] + 1));

    let kind: ColumnKind = 'categorical';
    if (isNumeric) {
      kind = 'numeric';
    } else if (uniqueStrs.length === 2) {
      kind = 'binary';
    }

    return {
      key,
      label: humanizeColumnKey(key),
      kind,
      uniqueCount: uniqueStrs.length,
      uniqueValues: uniqueStrs,
      isIdLike,
      unit: KNOWN_LABELS[key]?.unit,
    };
  });
}

export function getNumericValues(records: SurveyRecord[], key: string): number[] {
  const out: number[] = [];
  for (const row of records) {
    const val = row[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      out.push(val);
    } else if (typeof val === 'string') {
      const cleaned = val.replace(/[$€£,\s]/g, '');
      const parsed = Number(cleaned);
      if (cleaned !== '' && Number.isFinite(parsed)) {
        out.push(parsed);
      }
    }
  }
  return out;
}

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function computeDescriptiveStats(values: number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) {
    return {
      n: 0,
      sum: 0,
      mean: 0,
      median: 0,
      modes: [],
      sampleVariance: 0,
      sampleStd: 0,
      popVariance: 0,
      popStd: 0,
      min: 0,
      max: 0,
      range: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      skewness: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const median = percentileSorted(sorted, 0.5);
  const q1 = percentileSorted(sorted, 0.25);
  const q3 = percentileSorted(sorted, 0.75);
  const min = sorted[0];
  const max = sorted[n - 1];

  // Mode calculation
  const freqMap = new Map<number, number>();
  let maxFreq = 0;
  for (const v of values) {
    const f = (freqMap.get(v) || 0) + 1;
    freqMap.set(v, f);
    if (f > maxFreq) maxFreq = f;
  }
  const modes =
    maxFreq > 1
      ? Array.from(freqMap.entries())
          .filter(([, f]) => f === maxFreq)
          .map(([v]) => v)
          .sort((a, b) => a - b)
      : [];

  let sqDiffSum = 0;
  let cubeDiffSum = 0;
  for (const v of values) {
    const d = v - mean;
    sqDiffSum += d * d;
    cubeDiffSum += d * d * d;
  }

  const popVariance = sqDiffSum / n;
  const sampleVariance = n > 1 ? sqDiffSum / (n - 1) : 0;
  const popStd = Math.sqrt(popVariance);
  const sampleStd = Math.sqrt(sampleVariance);

  const skewness = popStd > 0 ? cubeDiffSum / n / Math.pow(popStd, 3) : 0;

  return {
    n,
    sum,
    mean,
    median,
    modes,
    sampleVariance,
    sampleStd,
    popVariance,
    popStd,
    min,
    max,
    range: max - min,
    q1,
    q3,
    iqr: q3 - q1,
    skewness,
  };
}

export function computeFrequencies(records: SurveyRecord[], key: string): FrequencyItem[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of records) {
    const raw = row[key];
    const label = raw === null || raw === undefined || String(raw).trim() === '' ? 'Sin respuesta' : String(raw).trim();
    counts.set(label, (counts.get(label) || 0) + 1);
    total += 1;
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  let cumulativeCount = 0;

  return sorted.map(([label, count]) => {
    cumulativeCount += count;
    const relative = total > 0 ? count / total : 0;
    const percent = relative * 100;
    const cumulativePercent = total > 0 ? (cumulativeCount / total) * 100 : 0;
    return {
      label,
      count,
      relative,
      percent,
      cumulativeCount,
      cumulativePercent,
    };
  });
}

export function computeHistogram(values: number[], requestedBins?: number): HistogramBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [
      {
        start: min - 0.5,
        end: max + 0.5,
        midpoint: min,
        count: values.length,
        relative: 1,
        label: `${min.toFixed(1)}`,
      },
    ];
  }

  // Sturges' rule fallback
  const binCount = requestedBins ?? Math.max(5, Math.min(12, Math.ceil(1 + 3.322 * Math.log10(values.length))));
  const width = (max - min) / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, idx) => {
    const start = min + idx * width;
    const end = idx === binCount - 1 ? max : min + (idx + 1) * width;
    return {
      start,
      end,
      midpoint: (start + end) / 2,
      count: 0,
      relative: 0,
      label: `${start.toFixed(1)}–${end.toFixed(1)}`,
    };
  });

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }

  const n = values.length;
  for (const b of bins) {
    b.relative = b.count / n;
  }

  return bins;
}

// High-precision error function (Abramowitz & Stegun 7.1.26)
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t) *
      Math.exp(-ax * ax);
  return sign * y;
}

export function standardNormalPDF(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

export function standardNormalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function normalPDF(x: number, mean: number, std: number): number {
  if (std <= 0) return 0;
  const z = (x - mean) / std;
  return standardNormalPDF(z) / std;
}

export function normalCDF(x: number, mean: number, std: number): number {
  if (std <= 0) return x >= mean ? 1 : 0;
  return standardNormalCDF((x - mean) / std);
}

// Log-factorial helper for overflow-free binomial coefficients
const LOG_FACT_CACHE: number[] = [0, 0];
function logFactorial(n: number): number {
  if (n < 0) return 0;
  if (LOG_FACT_CACHE[n] !== undefined) return LOG_FACT_CACHE[n];
  let last = LOG_FACT_CACHE.length - 1;
  let acc = LOG_FACT_CACHE[last];
  for (let i = last + 1; i <= n; i++) {
    acc += Math.log(i);
    LOG_FACT_CACHE[i] = acc;
  }
  return LOG_FACT_CACHE[n];
}

export function logCombination(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

export function binomialPMF(n: number, k: number, p: number): number {
  if (k < 0 || k > n || n < 0) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  const logProb = logCombination(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logProb);
}

export function binomialCDF(n: number, k: number, p: number): number {
  let sum = 0;
  const limit = Math.min(n, Math.floor(k));
  for (let i = 0; i <= limit; i++) {
    sum += binomialPMF(n, i, p);
  }
  return Math.min(1, sum);
}

export function binomialUpperTail(n: number, k: number, p: number): number {
  let sum = 0;
  const start = Math.max(0, Math.ceil(k));
  for (let i = start; i <= n; i++) {
    sum += binomialPMF(n, i, p);
  }
  return Math.min(1, sum);
}

export function generateSamplingDistribution(
  populationValues: number[],
  sampleSize: number,
  numSamples: number,
  withReplacement: boolean
): SampleDraw[] {
  const N = populationValues.length;
  if (N === 0) return [];
  const effectiveN = withReplacement ? sampleSize : Math.min(sampleSize, N);
  const popMean = populationValues.reduce((a, b) => a + b, 0) / N;

  const draws: SampleDraw[] = [];

  for (let m = 1; m <= numSamples; m++) {
    const sample: number[] = [];
    if (withReplacement) {
      for (let i = 0; i < effectiveN; i++) {
        const idx = Math.floor(Math.random() * N);
        sample.push(populationValues[idx]);
      }
    } else {
      // Partial Fisher-Yates shuffle on index copy
      const indices = Array.from({ length: N }, (_, i) => i);
      for (let i = 0; i < effectiveN; i++) {
        const j = i + Math.floor(Math.random() * (N - i));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
        sample.push(populationValues[indices[i]]);
      }
    }

    const stats = computeDescriptiveStats(sample);
    draws.push({
      sampleIndex: m,
      values: sample,
      mean: stats.mean,
      min: stats.min,
      max: stats.max,
      sampleStd: stats.sampleStd,
      diffFromPopMean: stats.mean - popMean,
    });
  }

  return draws;
}
