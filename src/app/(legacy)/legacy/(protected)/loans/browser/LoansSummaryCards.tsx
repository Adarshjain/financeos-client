'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LoansSummaryResponse } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface LoansSummaryCardsProps {
  summary: LoansSummaryResponse;
  totalMonthlyEmi: number;
}

export function LoansSummaryCards({
  summary,
  totalMonthlyEmi,
}: LoansSummaryCardsProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl p-3.5 sm:p-4">
      <CardContent className="p-0 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Outstanding
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
            {formatMoney(summary.totalOutstanding)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Monthly EMI
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
            {formatMoney(totalMonthlyEmi)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Loans
          </p>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
            {summary.activeLoanCount}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
