'use client';

import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';

export interface FnoMetrics {
  totalRealizedPnl: number;
  totalCharges: number;
  totalCount: number;
  profitableCount: number;
  futuresCount: number;
  optionsCount: number;
  winRate: number;
}

interface FnoSummaryCardsProps {
  metrics: FnoMetrics;
}

export function FnoSummaryCards({ metrics }: FnoSummaryCardsProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/60 gap-2 sm:gap-0">
        {/* Total Realized P&L */}
        <div className="sm:px-3 pt-1 sm:pt-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Realized P&L
          </div>
          <div
            className={`text-base sm:text-lg font-black tracking-tight mt-0.5 ${
              metrics.totalRealizedPnl >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {metrics.totalRealizedPnl >= 0 ? '+' : ''}
            {formatMoney(metrics.totalRealizedPnl)}
          </div>
        </div>

        {/* Total Trades */}
        <div className="sm:px-3 pt-1 sm:pt-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total Trades
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.totalCount}</span>
            <span className="text-2xs font-normal text-slate-400">
              ({metrics.futuresCount} Fut / {metrics.optionsCount} Opt)
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="sm:px-3 pt-1 sm:pt-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Win Rate
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
            {metrics.winRate.toFixed(1)}%
          </div>
        </div>

        {/* Total Charges */}
        <div className="sm:px-3 pt-1 sm:pt-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Charges & Taxes
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
            {formatMoney(metrics.totalCharges)}
          </div>
        </div>
      </div>
    </Card>
  );
}
