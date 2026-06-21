// Presentational KPI renderer. Pure — takes only KpiData, no fetching. Reused
// by the live preview now and by the dashboard later. Values are displayed
// exactly as the API returns them (amount is signed — no client recomputation).

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import type { KpiData } from '@/lib/reports.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

const directionStyles = {
  up: { Icon: ArrowUp, className: 'text-emerald-600 dark:text-emerald-400' },
  down: { Icon: ArrowDown, className: 'text-red-600 dark:text-red-400' },
  flat: { Icon: Minus, className: 'text-slate-500' },
} as const;

export function KpiView({ data }: { data: KpiData }) {
  const fmt = (n: number) => {
    if (data.aggregation === 'count') {
      return new Intl.NumberFormat('en-IN').format(n);
    }
    if (data.measure === 'amount') return formatMoney(n);
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
  };

  const comparison = data.comparison;
  const dir = comparison ? directionStyles[comparison.direction] : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
        {data.value === null ? '—' : fmt(data.value)}
      </p>

      {comparison && dir && (
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            dir.className,
          )}
        >
          <dir.Icon className="h-4 w-4" />
          <span className="tabular-nums">
            {comparison.changePercent === null
              ? fmt(comparison.change)
              : `${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(1)}%`}
          </span>
          <span className="font-normal text-slate-500 dark:text-slate-400">
            vs previous period
          </span>
        </div>
      )}

      {data.meta.dateRange && (
        <p className="text-xs text-slate-500">
          {formatDate(data.meta.dateRange.from)} – {formatDate(data.meta.dateRange.to)}
        </p>
      )}
    </div>
  );
}
