// Pure model behind the allocation view: the template's CHART data (open
// positions' current value by asset class) as donut slices, largest first,
// and the filter that narrows positions to one slice.

import { seriesColor } from '@/components/charts/chart-format';
import type { ChartData, FilterClause } from '@/lib/reports.types';

/** The asset classes the server knows (positions.assetClass). */
export const ASSET_CLASSES = ['EQUITY', 'DEBT', 'HYBRID', 'GOLD', 'INTERNATIONAL', 'OTHER'] as const;

/** The chart's bucket for holdings with no asset class yet. */
export const NO_CLASS = '(none)';

export interface AllocationSlice {
  /** The stored category ("EQUITY", or "(none)"). */
  key: string;
  label: string;
  value: number;
  /** 0–1 of the total. */
  share: number;
  color: string;
}

/** Positive buckets as slices, largest first; empty when there is nothing to split. */
export function allocationSlices(data: ChartData): AllocationSlice[] {
  const values = data.series[0]?.data ?? [];
  const positive = data.categories
    .map((key, i) => ({ key, value: values[i] ?? 0 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = positive.reduce((sum, s) => sum + s.value, 0);
  return positive.map((s, i) => ({
    key: s.key,
    label: s.key === NO_CLASS ? 'Unclassified' : (data.valueLabels?.[s.key] ?? s.key),
    value: s.value,
    share: total > 0 ? s.value / total : 0,
    color: seriesColor(i),
  }));
}

/** The positions filter for one slice; "Unclassified" is every holding outside the known classes. */
export function sliceFilter(key: string): FilterClause {
  if ((ASSET_CLASSES as readonly string[]).includes(key)) return { field: 'assetClass', operator: 'is', value: key };
  return { field: 'assetClass', operator: 'not_in', value: [...ASSET_CLASSES] };
}

/** "64%", "<1%" for a sliver. */
export function formatShare(share: number): string {
  const pct = share * 100;
  return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
}
