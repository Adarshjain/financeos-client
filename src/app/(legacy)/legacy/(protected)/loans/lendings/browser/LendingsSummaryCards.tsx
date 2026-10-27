'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LoansSummaryResponse } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface LendingsSummaryCardsProps {
  summary: LoansSummaryResponse;
}

export function LendingsSummaryCards({ summary }: LendingsSummaryCardsProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl p-3.5 sm:p-4">
      <CardContent className="p-0 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Lent Out
          </p>
          <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatMoney(summary.lentOutstanding)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Borrowed
          </p>
          <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {formatMoney(summary.borrowedOutstanding)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Net Position
          </p>
          <p
            className={`text-xl sm:text-lg font-black tabular-nums mt-0.5 ${
              summary.netReceivable >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.netReceivable >= 0 ? '+' : ''}
            {formatMoney(summary.netReceivable)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
