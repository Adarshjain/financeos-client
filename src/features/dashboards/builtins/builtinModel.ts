// Pure helpers the cards & spending built-ins share: typed reads of report rows, the ad-hoc KPI
// request their drills open, whole-day arithmetic and rupee/count formatting.

import { formatMoney } from '@/lib/format';
import type { FilterClause, RunReportRequest, TableRow } from '@/lib/reports.types';

/** A row cell as a string ('' when absent). */
export function cellText(row: TableRow | undefined, key: string): string {
  const v = row?.[key];
  return v == null ? '' : String(v);
}

/** A row cell as a finite number, or null. */
export function cellNumber(row: TableRow | Record<string, unknown> | undefined, key: string): number | null {
  const v = row?.[key];
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** An ad-hoc KPI (sum of `measure`) for "View underlying data", without a period comparison. */
export function adhocKpi(datasource: string, measure: string, filters: FilterClause[]): RunReportRequest {
  return {
    type: 'KPI',
    datasource,
    definition: { measure, aggregation: 'sum', filters, comparison: { enabled: false } },
  };
}

/** Whole days from `from` to `to` (both YYYY-MM-DD; negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const utc = (d: string) => {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** A whole number in Indian grouping ("42,300"). */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

/** Rupees without paise ("₹14,100"), for summary figures whose drill shows the exact amount. */
export function formatRupees(value: number): string {
  return formatMoney(value);
}
