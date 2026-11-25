export type SurveyValue = string | number;

export interface SurveyRecord {
  [key: string]: SurveyValue;
}

export type ColumnKind = 'numeric' | 'binary' | 'categorical';

export interface ColumnMeta {
  key: string;
  label: string;
  kind: ColumnKind;
  uniqueCount: number;
  uniqueValues: string[];
  isIdLike?: boolean;
  unit?: string;
}

export interface DescriptiveStats {
  n: number;
  sum: number;
  mean: number;
  median: number;
  modes: number[];
  sampleVariance: number;
  sampleStd: number;
  popVariance: number;
  popStd: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
}

export interface FrequencyItem {
  label: string;
  count: number;
  relative: number;
  percent: number;
  cumulativeCount: number;
  cumulativePercent: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  midpoint: number;
  count: number;
  relative: number;
  label: string;
}

export interface SampleDraw {
  sampleIndex: number;
  values: number[];
  mean: number;
  min: number;
  max: number;
  sampleStd: number;
  diffFromPopMean: number;
}

export interface DatasetState {
  name: string;
  sourceLabel: string;
  isDefault: boolean;
  records: SurveyRecord[];
  columns: ColumnMeta[];
}
