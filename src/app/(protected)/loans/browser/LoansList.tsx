'use client';

import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Page } from '@/lib/pagination';
import { LoanResponse, LoanStatus } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

export function getStatusBadge(status: LoanStatus) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold text-2xs uppercase px-2 py-0.5"
        >
          Active
        </Badge>
      );
    case 'closed':
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold text-2xs uppercase px-2 py-0.5"
        >
          Closed
        </Badge>
      );
    case 'foreclosed':
      return (
        <Badge
          variant="outline"
          className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-semibold text-2xs uppercase px-2 py-0.5"
        >
          Foreclosed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-2xs uppercase">
          {status}
        </Badge>
      );
  }
}

interface LoansListProps {
  page: Page<LoanResponse>;
  filteredContent: LoanResponse[];
  onPageChange: (newPage: number) => void;
}

export function LoansList({
  page,
  filteredContent,
  onPageChange,
}: LoansListProps) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Mobile View: Flat List */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredContent.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No loans found matching your criteria.
          </div>
        ) : (
          filteredContent.map((loan) => {
            const progressPct =
              loan.totalInstallments > 0
                ? Math.round(
                    (loan.settledInstallments / loan.totalInstallments) * 100
                  )
                : 0;

            return (
              <div
                key={loan.id}
                onClick={() => router.push(`/loans/${loan.id}`)}
                className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer active:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {loan.name}
                      {getStatusBadge(loan.status)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {loan.lender}
                      {loan.loanAccountNumber
                        ? ` · #${loan.loanAccountNumber}`
                        : ''}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-2xs">
                      Outstanding
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(loan.outstandingPrincipal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">
                      Current EMI
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatMoney(loan.currentEmi)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-2xs text-slate-500">
                    <span>Progress</span>
                    <span>
                      {loan.settledInstallments}/{loan.totalInstallments} paid (
                      {progressPct}%)
                    </span>
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
          })
        )}
      </div>

      {/* Desktop View: Clean Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider text-2xs">
              <th className="py-3 px-4">Loan / Lender</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4 text-right">Outstanding Balance</th>
              <th className="py-3 px-4 text-center">Progress (EMIs)</th>
              <th className="py-3 px-4 text-right">Next Due</th>
              <th className="py-3 px-4 text-center">Rate / Effective APR</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredContent.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No loans found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredContent.map((loan) => {
                const progressPct =
                  loan.totalInstallments > 0
                    ? Math.round(
                        (loan.settledInstallments / loan.totalInstallments) *
                          100
                      )
                    : 0;

                return (
                  <tr
                    key={loan.id}
                    onClick={() => router.push(`/loans/${loan.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="font-semibold">{loan.name}</div>
                      <div className="text-xs text-slate-500 font-normal">
                        {loan.lender}
                        {loan.loanAccountNumber
                          ? ` · #${loan.loanAccountNumber}`
                          : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="capitalize text-2xs">
                        {loan.loanType.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(loan.outstandingPrincipal)}
                      <div className="text-2xs text-slate-500 font-normal">
                        EMI: {formatMoney(loan.currentEmi)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center min-w-[140px]">
                      <div className="text-2xs text-slate-500 mb-1">
                        {loan.settledInstallments} / {loan.totalInstallments}{' '}
                        paid ({progressPct}%)
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {loan.nextDueDate ? formatDate(loan.nextDueDate) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono">
                        <span>{loan.currentAnnualRatePct}%</span>
                        {loan.effectiveAprPct != null && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            / {loan.effectiveAprPct}% APR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(loan.status)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <TablePagination page={page} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
