'use client';

// Small pieces shared by the cards & spending built-ins: a drillable figure
// (the KpiView value affordance), typed reads of report rows, a pager for list
// views, and the ad-hoc KPI requests their drills open.

import type { ReactNode } from 'react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import type { FilterClause, RunReportRequest, TablePage, TableRow } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

interface DrillValueProps {
  onClick: () => void;
  /** What the tap opens, for screen readers ("view Axis Atlas balance breakdown"). */
  label: string;
  /** Typography of the figure; the button wears it unchanged. */
  className?: string;
  title?: string;
  children: ReactNode;
}

/**
 * A figure that opens its underlying data: same typography as plain text, a
 * dotted underline on hover/focus (as KpiView's value), sized to its text. Its
 * accessible name is the figure followed by what the tap opens
 * ("₹14,100 — view underlying data"), so the visible text is in the name.
 */
export function DrillValue({ onClick, label, className, title, children }: DrillValueProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'max-w-full text-left decoration-dotted underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none',
        className,
      )}
    >
      {children}
      {' '}
      <span className="sr-only">— {label}</span>
    </button>
  );
}

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

/** The pager under a list view, only when the rows span more than one page. */
export function ListPager({
  page,
  unit,
  onPageChange,
  loading,
}: {
  page: TablePage;
  unit: string;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) {
  if (page.totalPages <= 1) return null;
  return (
    <TablePagination
      page={page}
      unit={unit}
      onPageChange={onPageChange}
      loading={loading}
      className="shrink-0 border-t border-slate-100 px-4 py-2 text-xs dark:border-slate-800"
    />
  );
}

/** An ad-hoc KPI (sum of `measure`) for "View underlying data", without a period comparison. */
export function adhocKpi(datasource: string, measure: string, filters: FilterClause[]): RunReportRequest {
  return {
    type: 'KPI',
    datasource,
    definition: { measure, aggregation: 'sum', filters, comparison: { enabled: false } },
  };
}

/** The row list's empty / error line inside a widget body. */
export function WidgetNote({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' }) {
  return (
    <p
      className={cn(
        'px-4 py-3 text-xs',
        tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
      )}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      {children}
    </p>
  );
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

const WHOLE_RUPEES = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Rupees without paise ("₹14,100"), for summary figures whose drill shows the exact amount. */
export function formatRupees(value: number): string {
  return WHOLE_RUPEES.format(value);
}
