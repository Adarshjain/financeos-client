'use client';

import { Badge } from '@/components/ui/badge';
import { Position } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

export const parseNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'string' ? parseFloat(val) : val;
};

interface MetricItemProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  valueClassName?: string;
}

export function MetricItem({
  label,
  value,
  subValue,
  valueClassName,
}: MetricItemProps) {
  return (
    <div className="p-1">
      <div className="text-2xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={`text-base font-extrabold tabular-nums mt-0.5 ${
          valueClassName || 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </div>
      {subValue && <div className="mt-0.5">{subValue}</div>}
    </div>
  );
}

interface HoldingSummaryMetricsProps {
  pos: Position;
}

export function HoldingSummaryMetrics({ pos }: HoldingSummaryMetricsProps) {
  const unrl = parseNumber(pos.unrealizedGainLoss);
  const unrlPct = pos.unrealizedGainLossPercent
    ? parseNumber(pos.unrealizedGainLossPercent)
    : 0;
  const rlz = parseNumber(pos.realizedGainLoss);

  return (
    <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all grid grid-cols-2 sm:grid-cols-3 gap-2">
      <MetricItem label="Quantity" value={pos.quantity} />
      <MetricItem label="Avg Cost" value={formatMoney(pos.avgCost)} />
      <MetricItem label="Invested" value={formatMoney(pos.invested)} />
      <MetricItem
        label="Current Value"
        value={formatMoney(pos.currentValue)}
        subValue={
          parseNumber(pos.quantity) > 0 && !pos.lastPrice && pos.currentValue ? (
            <Badge
              variant="outline"
              className="text-2xs px-1 py-0 font-normal text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30"
            >
              at cost
            </Badge>
          ) : undefined
        }
      />
      <MetricItem
        label="Last Price (LTP)"
        value={formatMoney(pos.lastPrice)}
        subValue={
          pos.lastPriceAsOf ? (
            <div className="text-2xs text-slate-400">
              As of {formatDate(pos.lastPriceAsOf)}
            </div>
          ) : undefined
        }
      />
      <MetricItem
        label="Unrealized P&L"
        value={`${unrl >= 0 ? '+' : ''}${formatMoney(pos.unrealizedGainLoss)}`}
        valueClassName={
          unrl >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }
        subValue={
          <div
            className={`text-2xs font-bold ${
              unrlPct >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {unrlPct >= 0 ? '+' : ''}
            {pos.unrealizedGainLossPercent}%
          </div>
        }
      />
      <MetricItem
        label="Realized P&L"
        value={`${rlz >= 0 ? '+' : ''}${formatMoney(pos.realizedGainLoss)}`}
        valueClassName={
          rlz >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }
      />
      <MetricItem
        label="Dividends"
        value={formatMoney(pos.dividends || '0')}
        valueClassName="text-emerald-600 dark:text-emerald-400"
      />
      <MetricItem
        label="Total Charges"
        value={formatMoney(pos.totalCharges)}
      />
      <MetricItem
        label="XIRR"
        value={pos.xirr ? `${pos.xirr}%` : 'N/A'}
        valueClassName="text-blue-600 dark:text-blue-400"
      />
      <MetricItem
        label="Abs Return"
        value={
          pos.absoluteReturnPercent
            ? `${pos.absoluteReturnPercent}%`
            : 'N/A'
        }
        valueClassName="text-blue-600 dark:text-blue-400"
      />
    </div>
  );
}
