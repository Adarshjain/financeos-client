// Series helpers shared by the Legacy and Dinero charts. Pure — no React.

import { niceTicks } from '@/lib/charts/chart-format';
import type { ChartData } from '@/lib/reports.types';

type Series = ChartData['series'][number];

/**
 * Y ticks from the data extent, including the zero baseline unless `includeZero` is off. A stack's
 * extent is its per-category positive / negative sums, not single values.
 */
export function yAxisTicks(
  series: Series[],
  categoryCount: number,
  stacked: boolean,
  includeZero = true
): number[] {
  let min = includeZero ? 0 : Infinity;
  let max = includeZero ? 0 : -Infinity;
  for (let i = 0; i < categoryCount; i++) {
    let up = 0;
    let down = 0;
    for (const s of series) {
      const v = s.data[i] ?? 0;
      if (stacked) {
        if (v > 0) up += v;
        else down += v;
      } else {
        up = Math.max(up, v);
        down = Math.min(down, v);
      }
    }
    if (!includeZero && !stacked) {
      // Without the zero baseline, only real values bound the axis.
      for (const s of series) {
        const v = s.data[i];
        if (v == null) continue;
        max = Math.max(max, v);
        min = Math.min(min, v);
      }
      continue;
    }
    max = Math.max(max, up);
    min = Math.min(min, down);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return niceTicks(0, 0);
  return niceTicks(min, max);
}

export const OTHER_NAME = 'Other';
export type FoldedSeries = Series & { folded?: boolean };

/**
 * Past the `slots` categorical slots, the smallest series fold into one neutral
 * "Other" series rather than cycling colours (two series would share a hue).
 * Only additive measures can be summed; anything else keeps every series.
 */
export function foldSeries(
  series: Series[],
  categoryCount: number,
  aggregation: string | undefined,
  slots: number
): FoldedSeries[] {
  if (series.length <= slots) return series;
  if (aggregation && aggregation !== 'sum' && aggregation !== 'count')
    return series;
  const total = (s: Series) =>
    s.data.reduce<number>((sum, v) => sum + Math.abs(v ?? 0), 0);
  const ranked = [...series].sort((a, b) => total(b) - total(a));
  const keep = new Set(ranked.slice(0, slots - 1));
  const rest = ranked.slice(slots - 1);
  const other: FoldedSeries = {
    name: OTHER_NAME,
    folded: true,
    data: Array.from({ length: categoryCount }, (_, i) =>
      rest.reduce<number>((sum, s) => sum + (s.data[i] ?? 0), 0)
    ),
  };
  // Kept series stay in their original order so colour follows the entity.
  return [...series.filter((s) => keep.has(s)), other];
}

export function formatShare(ratio: number): string {
  const pct = ratio * 100;
  return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
}

/** Legend/tooltip label for a series keyed by its measure field, e.g. "spend" -> "Spend". */
export function seriesLabel(name: string): string {
  return name.length ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}
