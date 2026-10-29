'use client';

// Small pieces shared by the cards & spending built-ins: a drillable figure
// (the KpiView value affordance), a pager for list views and the row list's note.
// The pure helpers (row reads, ad-hoc KPI, formatting) live in
// '@/features/dashboards/builtins/builtinModel'.

import type { ReactNode } from 'react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import type { TablePage } from '@/lib/reports.types';
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
