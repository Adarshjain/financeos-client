// Human-readable labels for builder dropdowns.

import type {
  Aggregation,
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
  fy: 'Financial year',
};

export { CHART_TYPE_LABELS } from '@/features/reports/chartTypeLabelsModel';

/** Turn an operator/field token like `last_x_days` into `Last N days`. */
export function humanizeToken(token: string): string {
  return token
    .replace(/_/g, ' ')
    .replace(/\bx\b/g, 'N')
    .replace(/^\w/, (c) => c.toUpperCase());
}
