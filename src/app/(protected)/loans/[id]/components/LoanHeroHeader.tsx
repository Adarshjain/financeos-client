'use client';

import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { LoanResponse } from '@/lib/loan.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface LoanHeroHeaderProps {
  loan: LoanResponse;
}

export function LoanHeroHeader({ loan }: LoanHeroHeaderProps) {
  const progressPct =
    loan.totalInstallments > 0
      ? Math.round((loan.settledInstallments / loan.totalInstallments) * 100)
      : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loan.name}
            </h1>
            <Badge variant="outline" className="capitalize text-2xs">
              {loan.loanType.replace('_', ' ')}
            </Badge>
            <Badge
              variant={
                loan.status === 'active'
                  ? 'default'
                  : loan.status === 'closed'
                    ? 'secondary'
                    : 'destructive'
              }
              className="capitalize text-2xs"
            >
              {loan.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lender:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {loan.lender}
            </span>
            {loan.loanAccountNumber
              ? ` · Account #${loan.loanAccountNumber}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
          <div>
            <div className="text-2xs text-slate-500 font-semibold uppercase">
              Nominal Rate
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {loan.currentAnnualRatePct}%
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <div>
            <div className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Effective APR
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {loan.effectiveAprPct != null
                ? `${loan.effectiveAprPct}%`
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 block text-2xs uppercase font-semibold">
            Outstanding Balance
          </span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(loan.outstandingPrincipal)}
          </span>
          <span className="text-2xs text-slate-500 block">
            Original: {formatMoney(loan.principal)}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-2xs uppercase font-semibold">
            Current EMI
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
            {formatMoney(loan.currentEmi)}
          </span>
          <span className="text-2xs text-slate-500 block">
            Next due: {loan.nextDueDate ? formatDate(loan.nextDueDate) : 'None'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-2xs uppercase font-semibold">
            Interest Paid
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatMoney(loan.totalInterestPaid)}
          </span>
          <span className="text-2xs text-slate-500 block">
            {formatMoney(loan.totalInterestRemaining)} remaining
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-2xs uppercase font-semibold">
            Timeline
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {loan.settledInstallments} / {loan.totalInstallments} EMIs
          </span>
          <span className="text-2xs text-slate-500 block">
            Ends:{' '}
            {loan.projectedEndDate ? formatDate(loan.projectedEndDate) : '—'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Amortization Progress</span>
          <span>{progressPct}% Settled</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
