// Pure helpers for the "View underlying data" dialog: query params, labels,
// value formatting and the CSV file name.

import { formatDateRangeForFilename, todayInAppZone } from '@/lib/date-range';
import { formatMeasureValue } from '@/lib/reports.helpers';
import type { SortClause } from '@/lib/reports.types';

import type { UnderlyingSource } from './underlying.types';

/** Rows per page in the dialog's tables. */
export const UNDERLYING_PAGE_SIZE = 25;

type Format = 'currency' | 'number' | 'percent';

/** Narrows a wire format string to the hint formatMeasureValue understands. */
export function asFormat(format: string | null | undefined): Format | undefined {
  return format === 'currency' || format === 'number' || format === 'percent' ? format : undefined;
}

/** The `sort` query param (`key,dir`), or undefined for the default order. */
export function sortParam(sort: SortClause | null): string | undefined {
  return sort ? `${sort.key},${sort.direction}` : undefined;
}

/** The part of a source that identifies it in a query key. */
export function sourceKey(source: UnderlyingSource): Record<string, unknown> {
  switch (source.kind) {
    case 'saved':
      return { kind: 'saved', reportId: source.reportId };
    case 'adhoc':
      return { kind: 'adhoc', request: source.request };
    case 'builtin':
      return { kind: 'builtin', key: source.key, params: source.params };
  }
}

const AGGREGATION_LABELS: Record<string, string> = {
  sum: 'Sum',
  avg: 'Average',
  count: 'Count',
  min: 'Min',
  max: 'Max',
};

/** "Sum" / "Average" / "Count" / "Min" / "Max" for a wire aggregation. */
export function aggregationLabel(aggregation: string): string {
  return AGGREGATION_LABELS[aggregation.toLowerCase()] ?? aggregation;
}

/** A value formatted exactly like the KPI tile shows it. */
export function formatKpiValue(
  value: number | null | undefined,
  kpi: { measure: string; aggregation: string; format?: string | null },
): string {
  return formatMeasureValue(value, {
    field: kpi.measure,
    aggregation: kpi.aggregation,
    format: asFormat(kpi.format),
  });
}

/** An amount carrying only a format hint (summary lines, not-counted items, breakdown steps). */
export function formatAmount(value: number | null | undefined, format: string | null | undefined): string {
  return formatMeasureValue(value, { format: asFormat(format) });
}

/** Strips characters file systems reject and collapses whitespace. Never adds anything. */
export function sanitizeFilename(name: string): string {
  return (
    name
      // Tabs and newlines become spaces before the control characters go.
      .replace(/\s+/g, ' ')
      // eslint-disable-next-line no-control-regex
      .replace(/[/\\:*?"<>|\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * `<title> <range>.csv`. The range is the period's own label with the year
 * always present; an unbounded period (no range) is named for today.
 */
export function underlyingCsvFilename(
  title: string,
  range: { from: string; to: string } | null | undefined,
  today: string = todayInAppZone(),
): string {
  const label = range
    ? formatDateRangeForFilename(range.from, range.to)
    : formatDateRangeForFilename(today, today);
  return `${sanitizeFilename(`${title} ${label}`)}.csv`;
}

/** Saves a blob as a download under `filename`. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers still read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
