// Pure helpers for the "View underlying data" dialog: query params, labels,
// value formatting and the CSV file name.

import { formatMeasure } from '@/features/reports/measureFormat';
import { formatCell } from '@/features/reports/view/cells';
import { formatDateRangeForFilename, todayInAppZone } from '@/lib/date-range';
import type { SortClause, TableColumn, TableRow } from '@/lib/reports.types';

import type { UnderlyingSource } from './underlying.types';

/** Rows per page in the dialog's tables. */
export const UNDERLYING_PAGE_SIZE = 25;

/** Per datasource, the column printed beside the name instead of in its own (net worth: the kind). */
const SUBTITLE_KEYS: Record<string, string> = { net_worth: 'kind' };

/** The column a datasource's underlying rows fold into their first column, or null. */
export function underlyingSubtitleKey(datasource: string): string | null {
  return SUBTITLE_KEYS[datasource] ?? null;
}

/** One group of a page's rows: the stored group value (its label comes from the column) and the rows in page order. */
export interface UnderlyingGroup {
  value: unknown;
  rows: TableRow[];
}

/**
 * A page's rows split by `groupField`, each group keeping the page's order. Groups come in the
 * server's `groupTotals` order (net worth: assets, then liabilities) whatever the page's sort,
 * then any group the totals do not name in order of first appearance.
 */
export function partitionByGroup(
  rows: TableRow[],
  groupField: string,
  groupTotals: Record<string, number> | null | undefined,
): UnderlyingGroup[] {
  const groups = new Map<string, UnderlyingGroup>();
  for (const key of Object.keys(groupTotals ?? {})) groups.set(key, { value: key, rows: [] });
  for (const row of rows) {
    const value = row[groupField];
    const key = String(value ?? '');
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { value, rows: [row] });
  }
  return [...groups.values()].filter((g) => g.rows.length > 0);
}

type Format = 'currency' | 'number' | 'percent';

/** Narrows a wire format string to the hint formatMeasure understands. */
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

/** A value formatted exactly like the KPI tile shows it. */
export function formatKpiValue(
  value: number | null | undefined,
  kpi: { measure: string; aggregation: string; format?: string | null },
): string {
  return formatMeasure(value, {
    field: kpi.measure,
    aggregation: kpi.aggregation,
    format: asFormat(kpi.format),
  });
}

/** An amount carrying only a format hint (summary lines, not-counted items, breakdown steps). */
export function formatAmount(value: number | null | undefined, format: string | null | undefined): string {
  return formatMeasure(value, { format: asFormat(format) });
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

/**
 * A group header's label: the group column's server label for the value when it has one,
 * else the value title-cased, underscores as spaces ("credit_card" → "Credit Card").
 */
export function groupLabel(value: unknown, labels: Record<string, string> | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const label = labels?.[String(value)];
  if (label !== undefined) return label;
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** The group total for a group value, or undefined when there is none. */
export function groupTotal(totals: Record<string, number> | null | undefined, value: unknown): number | undefined {
  if (!totals || value === null || value === undefined) return undefined;
  const total = totals[String(value)];
  return typeof total === 'number' ? total : undefined;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-13" as "13 Oct"; anything else as it came. */
export function shortDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : value;
}

/** A cell as this table prints it: dates as "13 Oct", everything else as every report table does. */
export function cellText(value: unknown, column: TableColumn): string {
  if (column.type === 'date' && typeof value === 'string' && value !== '') return shortDate(value);
  return formatCell(value, column);
}

/** The column that names the row (the first that is not a date or a number); the first column otherwise. */
export const mainIndexOf = (columns: TableColumn[]) => Math.max(columns.findIndex((c) => c.type !== 'date' && c.type !== 'number'), 0);
