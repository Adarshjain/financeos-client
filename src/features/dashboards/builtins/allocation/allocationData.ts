// The allocation template's bucket for holdings with no asset class yet (moved from the Legacy allocation
// model, which imports it back), and the chart data the Dinero view draws.

import type { ChartData, FilterClause } from '@/lib/reports.types';

/** The asset classes the server knows (positions.assetClass). */
export const ASSET_CLASSES = ['EQUITY', 'DEBT', 'HYBRID', 'GOLD', 'INTERNATIONAL', 'OTHER'] as const;

/** The chart's bucket for holdings with no asset class yet. */
export const NO_CLASS = '(none)';

/**
 * The template's CHART data as a donut: positive buckets only, largest first, named by their display label
 * ("Equity", "Unclassified"). Null when there is nothing to split.
 */
export function allocationDonut(data: ChartData): ChartData | null {
  const values = data.series[0]?.data ?? [];
  const positive = data.categories
    .map((key, i) => ({ key, value: values[i] ?? 0 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  if (positive.length === 0) return null;
  return {
    ...data,
    chartType: 'donut',
    categories: positive.map((s) => sliceLabel(data, s.key)),
    series: [{ name: data.series[0]?.name ?? '', data: positive.map((s) => s.value) }],
    valueLabels: null,
    comparison: undefined,
  } as ChartData;
}

/** The positions filter for one slice; "Unclassified" is every holding outside the known classes. */
export function sliceFilter(key: string): FilterClause {
  if ((ASSET_CLASSES as readonly string[]).includes(key)) return { field: 'assetClass', operator: 'is', value: key };
  return { field: 'assetClass', operator: 'not_in', value: [...ASSET_CLASSES] };
}

/** The slice's display label as the donut names it ("Equity", "Unclassified"). */
export function sliceLabel(data: ChartData, key: string): string {
  return key === NO_CLASS ? 'Unclassified' : (data.valueLabels?.[key] ?? key);
}

/** The stored category behind a donut slice's label, or null (the folded "Other" slice has none). */
export function sliceKeyOf(data: ChartData, label: string): string | null {
  return data.categories.find((key) => sliceLabel(data, key) === label) ?? null;
}
