'use client';

import { Award, PieChart, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InvestmentSummary } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface PortfolioSummaryCardsProps {
  summary: InvestmentSummary | null;
  positionsCount: number;
}

const parseNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'string' ? parseFloat(val) : val;
};

export function PortfolioSummaryCards({ summary, positionsCount }: PortfolioSummaryCardsProps) {
  const totalPnlNum = parseNumber(summary?.totalPnl);
  const totalUnrealizedNum = parseNumber(summary?.totalUnrealized);
  const absReturnNum = parseNumber(summary?.absoluteReturnPercent);
  const xirrNum = summary?.xirr !== undefined && summary?.xirr !== null ? parseNumber(summary.xirr) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Portfolio Holdings Value
            </span>
            <Badge variant="outline" className="text-[10px] font-bold">
              {positionsCount} Positions
            </Badge>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatMoney(summary?.totalCurrentValue)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>
                Total Invested:{' '}
                <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatMoney(summary?.totalInvested)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className={`w-4 h-4 ${totalPnlNum >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              Overall Portfolio P&L
            </span>
            {summary?.absoluteReturnPercent && (
              <Badge
                className={`text-xs font-extrabold border-0 ${
                  totalPnlNum >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                }`}
              >
                {absReturnNum >= 0 ? '+' : ''}
                {summary.absoluteReturnPercent}%
              </Badge>
            )}
          </div>
          <div>
            <div
              className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${
                totalPnlNum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {totalPnlNum >= 0 ? '+' : ''}
              {formatMoney(summary?.totalPnl)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
              <span>
                Unrealized:{' '}
                <strong
                  className={
                    totalUnrealizedNum >= 0
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-rose-600 dark:text-rose-400 font-bold'
                  }
                >
                  {totalUnrealizedNum >= 0 ? '+' : ''}
                  {formatMoney(summary?.totalUnrealized)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Returns & Income Summary
          </span>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-[11px] text-slate-500">Annualized XIRR</div>
              <div
                className={`text-base font-black tabular-nums ${
                  (xirrNum ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summary?.xirr ? `${(xirrNum ?? 0) >= 0 ? '+' : ''}${summary.xirr}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Dividends Income</div>
              <div className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(summary?.totalDividends)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Abs Return %</div>
              <div
                className={`text-xs font-extrabold tabular-nums ${
                  absReturnNum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summary?.absoluteReturnPercent ? `${absReturnNum >= 0 ? '+' : ''}${summary.absoluteReturnPercent}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Total Charges Paid</div>
              <div className="text-xs font-extrabold tabular-nums text-slate-700 dark:text-slate-300">
                {formatMoney(summary?.totalCharges)}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
