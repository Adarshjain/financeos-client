'use client';

// Shared pieces of the investments & loans widget bodies: the tappable figure
// (same affordance as a KPI tile's value), the loading / error / empty states,
// money / percent / date formatting, and the ad-hoc KPI requests their drills open.

import { AlertCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { isoToDisplay } from '@/components/ui/date-input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { FilterClause, RunReportRequest } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------------ numbers & dates

/** A wire number (number or decimal string) as a number; null when absent or not a number. */
export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const WHOLE_RUPEES = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹ in whole rupees ("₹12,48,600"); the minus is a real minus sign. */
export function rupees(value: number): string {
  const text = WHOLE_RUPEES.format(Math.abs(value));
  return Math.round(value) < 0 ? `−${text}` : text;
}

/** ₹ with an explicit sign ("+₹8,420", "−₹2,100", "₹0"). */
export function signedRupees(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return rupees(0);
  return `${rounded > 0 ? '+' : '−'}${WHOLE_RUPEES.format(Math.abs(value))}`;
}

/** A percent with an explicit sign and two decimals ("+0.68%", "−2.10%"). */
export function signedPct(value: number): string {
  const text = Math.abs(value).toFixed(2);
  if (Number(text) === 0) return '0.00%';
  return `${value > 0 ? '+' : '−'}${text}%`;
}

/** Emerald for a gain, rose for a loss, the body colour for zero. */
export function gainTone(value: number | null): string {
  if (value == null || value === 0) return 'text-slate-900 dark:text-white';
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
}

/** YYYY-MM-DD → dd/mm/yyyy ('' when absent). */
export function fullDate(iso: string | null | undefined): string {
  return isoToDisplay(iso);
}

/** YYYY-MM-DD → dd/mm ('' when absent). */
export function dayMonth(iso: string | null | undefined): string {
  return isoToDisplay(iso).slice(0, 5);
}

// ------------------------------------------------------------------ drills

/** Open holdings' current value as a KPI: the portfolio value, or one asset class's share of it. */
export function positionsValueRequest(extra: FilterClause[] = []): RunReportRequest {
  return {
    type: 'KPI',
    datasource: 'positions',
    definition: {
      measure: 'currentValue',
      aggregation: 'sum',
      // Same filter as the allocation template: open holdings only.
      filters: [{ field: 'isOpen', operator: 'is', value: true }, ...extra],
      comparison: { enabled: false },
    },
  };
}

/** Equity-oriented gains booked this financial year for one term ('short' | 'long'). */
export function bookedGainsRequest(term: 'short' | 'long'): RunReportRequest {
  return {
    type: 'KPI',
    datasource: 'realized_lots',
    definition: {
      measure: 'realizedPnl',
      aggregation: 'sum',
      filters: [
        { field: 'sellDate', operator: 'current_fy' },
        { field: 'term', operator: 'is', value: term },
        { field: 'taxClass', operator: 'is', value: 'EQUITY_ORIENTED' },
      ],
    },
  };
}

// ------------------------------------------------------------------ pieces

/**
 * A figure that opens its underlying data: the KPI tile's dotted-underline
 * affordance. Its accessible name is the figure followed by what the tap opens
 * ("₹14,100 — view underlying data"), so the visible text is in the name.
 */
export function DrillValue({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  /** What the tap opens, e.g. "view underlying data for Current value" (also the tooltip). */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={capitalise(label)}
      className={cn(
        'max-w-full text-left tabular-nums decoration-dotted underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none',
        className,
      )}
    >
      {children}
      {' '}
      <span className="sr-only">— {label}</span>
    </button>
  );
}

function capitalise(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

const SKELETON_WIDTHS = ['w-2/3', 'w-full', 'w-11/12', 'w-4/5'];

/** Loading rows shaped like a widget's content. */
export function WidgetLoadingRows({ testId, rows = 4 }: { testId: string; rows?: number }) {
  return (
    <div className="space-y-2.5 px-4 pb-3 pt-1" data-testid={testId}>
      {SKELETON_WIDTHS.slice(0, rows).map((w, i) => (
        <Skeleton key={w} className={cn('rounded-md', i === 0 ? 'h-7' : 'h-4', w)} />
      ))}
    </div>
  );
}

/** A failed load: centred icon and "Couldn't load <what>: <reason>". */
export function WidgetLoadError({ what, error }: { what: string; error: unknown }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center text-xs text-rose-600 dark:text-rose-400"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 text-rose-500" />
      <p className="line-clamp-2">
        Couldn&apos;t load {what}: {getErrorMessage(error, 'request failed')}
      </p>
    </div>
  );
}

/** Nothing to show yet: a short line and an optional way forward. */
export function WidgetEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center px-4 pb-3">
      <EmptyState compact icon={icon} title={title} description={description} action={action} />
    </div>
  );
}

/** A thin progress bar, `pct` 0–100. */
export function ProgressBar({ pct, className, label }: { pct: number; className?: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className={cn('h-full rounded-full', className ?? 'bg-emerald-500')} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** Body frame shared by these widgets: a column that fills the card and scrolls inside. */
export function WidgetBody({ className, testId, children }: { className?: string; testId: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-h-0 flex-col', className)} data-testid={testId}>
      {children}
    </div>
  );
}
