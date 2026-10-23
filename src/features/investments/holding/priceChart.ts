import type { PriceHistoryPoint } from '@/lib/types';

import { shortDate } from '../investmentsFormat';

export type ChartRange = '1m' | '3m' | '1y' | 'all';

export const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

export const RANGE_TITLES: Record<ChartRange, string> = { '1m': '1 month', '3m': '3 months', '1y': '1 year', all: 'All time' };

const MONTHS: Record<ChartRange, number | null> = { '1m': 1, '3m': 3, '1y': 12, all: null };

/** The date `months` before `iso` (both YYYY-MM-DD). */
function monthsBefore(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** The prices of a range, oldest first, counted back from the newest stored price. */
export function pricesInRange(history: readonly PriceHistoryPoint[], range: ChartRange): PriceHistoryPoint[] {
  const sorted = [...history].sort((a, b) => a.asOf.localeCompare(b.asOf));
  const months = MONTHS[range];
  if (months == null || sorted.length === 0) return sorted;
  const from = monthsBefore(sorted[sorted.length - 1].asOf, months);
  return sorted.filter((p) => p.asOf >= from);
}

/** The reports chart's data for one line of prices. */
export function priceChartData(points: readonly PriceHistoryPoint[]) {
  return {
    chartType: 'area',
    categories: points.map((p) => shortDate(p.asOf)),
    series: [{ name: 'Price', data: points.map((p) => Number(p.close)) }],
    measure: { field: 'amount', aggregation: 'sum' },
  } as never;
}
