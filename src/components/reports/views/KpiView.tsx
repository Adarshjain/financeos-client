// Presentational KPI renderer. Pure — takes only KpiData, no fetching. Reused
// by the live preview and by the dashboard. Values are displayed exactly as the
// API returns them (amount is signed — no client recomputation).
//
// The comparison line shows the delta ("+₹6,100 (+15.7%)") or, when the
// definition asked for `display: previous_value`, the previous period's value
// ("prev ₹38,900"); the hover carries whichever of the two is not on the line.
// The line's ARROW comes from `direction` (up/down/flat); its COLOR comes from
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
  const fmt = (n: number | null) =>
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
  // Responses from a server that predates `display` carry none and read as the delta.
  const showPreviousValue = comparison?.display === 'previous_value';
  const deltaText = comparison
    ? signedChange(comparison.change) +
      (comparison.changePercent !== null ? ` (${signedPercent(comparison.changePercent)})` : '')
    : '';
  const previousText = comparison ? `prev ${fmt(comparison.previousValue)}` : '';
  // The hover carries whichever of the two the line does not show
  // (e.g. "vs 1 May 26 – 31 May 26: ₹-38,900" under the delta).
  const comparedTitle = comparison
    ? `${fullComparedLabel}: ${showPreviousValue ? deltaText : fmt(comparison.previousValue)}`
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
          <span className="tabular-nums">{showPreviousValue ? previousText : deltaText}</span>
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
