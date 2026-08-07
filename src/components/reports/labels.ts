// Human-readable labels for builder dropdowns.

import type {
  Aggregation,
  ChartDefinition,
  Granularity,
} from '@/lib/reports.types';

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  sum: 'Sum',
  avg: 'Average',
  count: 'Count',
  min: 'Min',
  max: 'Max',
};

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

export const CHART_TYPE_LABELS: Record<ChartDefinition['chartType'], string> = {
  line: 'Line',
  bar: 'Bar',
  stackedBar: 'Stacked bar',
  area: 'Area',
  pie: 'Pie',
  donut: 'Donut',
};

/** Turn an operator/field token like `last_x_days` into `Last N days`. */
export function humanizeToken(token: string): string {
  return token
    .replace(/_/g, ' ')
    .replace(/\bx\b/g, 'N')
    .replace(/^\w/, (c) => c.toUpperCase());
}
