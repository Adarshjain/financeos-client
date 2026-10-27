import type { CorporateAction, PriceHistoryPoint } from '@/lib/types';

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

/** A share-count change on `exDate`: one old share became `factor` shares (split 1:2 and bonus 1:1 are both 2). */
export interface PriceSplit {
  exDate: string;
  factor: number;
}

/**
 * The splits among a holding's corporate actions, as the quantities treat them: a split and a bonus multiply
 * the share count by ratioTo / ratioFrom (the server stores held → held after for both). Demergers and mergers
 * move value between instruments, so they do not adjust the price; neither do draft, reverted or cancelled actions.
 */
export function splitsOf(actions: readonly CorporateAction[]): PriceSplit[] {
  const out: PriceSplit[] = [];
  for (const a of actions) {
    const kind = String(a.type ?? a.actionType ?? '').toLowerCase();
    if (kind !== 'split' && kind !== 'bonus') continue;
    if (a.status && a.status !== 'APPLIED') continue;
    if (!a.exDate || !a.ratioFrom || !a.ratioTo || a.ratioFrom <= 0 || a.ratioTo <= 0) continue;
    out.push({ exDate: a.exDate, factor: a.ratioTo / a.ratioFrom });
  }
  return out;
}

/**
 * Split-adjusted prices, like brokers and Google show: every price dated before a split's ex-date is divided by
 * that split's factor, across all later splits. A price on the ex-date is already post-split. Stored prices stay real.
 */
export function adjustForSplits(history: readonly PriceHistoryPoint[], splits: readonly PriceSplit[]): PriceHistoryPoint[] {
  if (splits.length === 0) return [...history];
  return history.map((p) => {
    const factor = splits.reduce((f, s) => (p.asOf < s.exDate ? f * s.factor : f), 1);
    return factor === 1 ? p : { ...p, close: Number(p.close) / factor };
  });
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
