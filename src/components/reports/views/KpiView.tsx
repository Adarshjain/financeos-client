// Presentational KPI renderer. Pure — takes only KpiData, no fetching. Reused
// by the live preview and by the dashboard. Values are displayed exactly as the
// API returns them (amount is signed — no client recomputation).
//
// The delta's ARROW comes from `direction` (up/down/flat); its COLOR comes from
// `sentiment` (good = green, bad = red, neutral = muted), which is the server's
// value judgement driven by the definition's `comparison.higherIsBetter`.

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { formatComparedRange, formatDateRange, formatDateRangeFull } from '@/lib/date-range';
import { formatMeasureValue } from '@/lib/reports.helpers';
import type { KpiData } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

const directionIcons = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
} as const;

const sentimentColors = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-500',
} as const;

export function KpiView({ data, className }: { data: KpiData, className?: string }) {
  const fmt = (n: number) =>
    formatMeasureValue(n, {
      field: data.measure,
      aggregation: data.aggregation,
      format: data.format ?? undefined,
    });
  // Signed absolute change — negatives already carry a minus from fmt().
  const signedChange = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)}`;
  const signedPercent = (p: number) => `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;

  const comparison = data.comparison;
  const Icon = comparison ? directionIcons[comparison.direction] : null;
  const range = data.meta.dateRange;
  const prevRange = comparison?.previousDateRange ?? null;
  // Full dates for hovers; the visible line uses the compact labels.
  const fullComparedLabel = prevRange
    ? `vs ${formatDateRangeFull(prevRange.from, prevRange.to)}`
    : 'vs previous period';
  // Surface the actual previous value on hover (e.g. "vs 1 May 26 – 31 May 26: ₹-38,900").
  const comparedTitle = comparison
    ? `${fullComparedLabel}: ${fmt(comparison.previousValue)}`
    : undefined;

  return (
    <div className={cn("flex flex-col gap-1 pt-1", className)}>
      <p className="text-lg text-slate-900 dark:text-white tabular-nums">
        {data.value === null ? '—' : fmt(data.value)}
      </p>

      {comparison && Icon && (
        <div
          className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            sentimentColors[comparison.sentiment],
          )}
          title={comparedTitle}
        >
          <Icon className="h-3 w-3" />
          <span className="tabular-nums">
            {signedChange(comparison.change)}
            {comparison.changePercent !== null &&
              ` (${signedPercent(comparison.changePercent)})`}
          </span>
        </div>
      )}
      {range && (
        <p
          className="text-xs text-slate-500"
          title={
            formatDateRangeFull(range.from, range.to) +
            (comparison ? ` ${fullComparedLabel}` : '')
          }
        >
          {formatDateRange(range.from, range.to)}
          {comparison && ` ${formatComparedRange(prevRange, range)}`}
        </p>
      )}

    </div>
  );
}
