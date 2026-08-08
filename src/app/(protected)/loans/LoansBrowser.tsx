'use client';

import {ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Search, Wallet, X} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';

import {fetchLoansAction} from '@/actions/loans';
import {LoanForm} from '@/app/(protected)/loans/LoanForm';
import {PageActionBar} from '@/components/layout/PageActionBarContext';
import {TablePagination} from '@/components/reports/views/TablePagination';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import type {Account} from '@/lib/account.types';
import type {Page} from '@/lib/pagination';
import type {LoanResponse, LoansSummaryResponse, LoanStatus} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

interface LoansBrowserProps {
  initialLoans: Page<LoanResponse>;
  summary: LoansSummaryResponse;
  bankAccounts: Account[];
}

export function LoansBrowser({
                               initialLoans,
                               summary,
                               bankAccounts,
                             }: LoansBrowserProps) {
  const router = useRouter();

  const [loansPage, setLoansPage] = useState<Page<LoanResponse>>(initialLoans);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = async (newStatus: string) => {
    setStatusFilter(newStatus);
    setLoading(true);
    try {
      const filter = newStatus === 'all' ? undefined : (newStatus as LoanStatus);
      const res = await fetchLoansAction(filter, 0, loansPage.size);
      if (res.success) {
        setLoansPage(res.data);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? undefined : (statusFilter as LoanStatus);
      const res = await fetchLoansAction(filter, newPage, loansPage.size);
      if (res.success) {
        setLoansPage(res.data);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoanSuccess = async () => {
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? undefined : (statusFilter as LoanStatus);
      const res = await fetchLoansAction(filter, loansPage.number, loansPage.size);
      if (res.success) {
        setLoansPage(res.data);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loansPage.content;
    return loansPage.content.filter(
        (l) =>
            l.name.toLowerCase().includes(q) ||
            l.lender.toLowerCase().includes(q) ||
            (l.loanAccountNumber && l.loanAccountNumber.toLowerCase().includes(q)),
    );
  }, [loansPage.content, search]);

  const getStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case 'active':
        return (
            <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold text-[10px] uppercase px-2 py-0.5"
            >
              Active
            </Badge>
        );
      case 'closed':
        return (
            <Badge
                variant="outline"
                className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold text-[10px] uppercase px-2 py-0.5"
            >
              Closed
            </Badge>
        );
      case 'foreclosed':
        return (
            <Badge
                variant="outline"
                className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-semibold text-[10px] uppercase px-2 py-0.5"
            >
              Foreclosed
            </Badge>
        );
      default:
        return (
            <Badge variant="outline" className="text-[10px] uppercase">
              {status}
            </Badge>
        );
    }
  };

  return (
      <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        {/* PageActionBar with Search, Dropdown, and Add Button */}
        <PageActionBar>
          <div className="flex items-center gap-2 w-full flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search loans or lenders..."
                  className="h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
              />
              {search && (
                  <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5"/>
                  </button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger
                  className="w-[140px] h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Statuses"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="closed" className="text-xs">Closed</SelectItem>
                <SelectItem value="foreclosed" className="text-xs">Foreclosed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setCreateOpen(true)} size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5"/> Add Loan
            </Button>
          </div>
        </PageActionBar>

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Professional Loans
          </h1>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="h-8 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5"/> Add Loan
          </Button>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Borrowings Outstanding
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatMoney(summary.totalOutstanding)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.activeLoanCount} active formal loan{summary.activeLoanCount === 1 ? '' : 's'}
              </p>
            </div>
            <div
                className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Wallet className="h-5 w-5"/>
            </div>
          </div>

          <div
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                P2P Net Position
              </p>
              <h2
                  className={`text-xl sm:text-2xl font-bold mt-0.5 ${
                      summary.netReceivable >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {summary.netReceivable >= 0 ? '+' : ''}
                {formatMoney(summary.netReceivable)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Lent {formatMoney(summary.lentOutstanding)} · Borrowed {formatMoney(summary.borrowedOutstanding)}
              </p>
            </div>
            <div
                className={`p-2.5 rounded-xl ${
                    summary.netReceivable >= 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                }`}
            >
              {summary.netReceivable >= 0 ? (
                  <ArrowUpRight className="h-5 w-5"/>
              ) : (
                  <ArrowDownLeft className="h-5 w-5"/>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {/* Mobile View: Clean Flat List (Kept intact as cards on mobile) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredContent.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No loans found.
                </div>
            ) : (
                filteredContent.map((loan) => {
                  const progressPct =
                      loan.totalInstallments > 0
                          ? Math.round((loan.settledInstallments / loan.totalInstallments) * 100)
                          : 0;

                  return (
                      <div
                          key={loan.id}
                          onClick={() => router.push(`/loans/${loan.id}`)}
                          className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer active:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div
                                className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {loan.name}
                              {getStatusBadge(loan.status)}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {loan.lender}
                              {loan.loanAccountNumber ? ` · #${loan.loanAccountNumber}` : ''}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1"/>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Outstanding</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(loan.outstandingPrincipal)}
                      </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Current EMI</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatMoney(loan.currentEmi)}
                      </span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Progress</span>
                            <span>
                        {loan.settledInstallments}/{loan.totalInstallments} paid ({progressPct}%)
                      </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{width: `${progressPct}%`}}
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
              <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
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
                      No loans found.
                    </td>
                  </tr>
              ) : (
                  filteredContent.map((loan) => {
                    const progressPct =
                        loan.totalInstallments > 0
                            ? Math.round((loan.settledInstallments / loan.totalInstallments) * 100)
                            : 0;

                    return (
                        <tr
                            key={loan.id}
                            onClick={() => router.push(`/loans/${loan.id}`)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                            <div className="font-semibold">{loan.name}</div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {loan.lender}
                              {loan.loanAccountNumber ? ` · #${loan.loanAccountNumber}` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {loan.loanType.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatMoney(loan.outstandingPrincipal)}
                            <div className="text-[10px] text-slate-500 font-normal">
                              EMI: {formatMoney(loan.currentEmi)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center min-w-[140px]">
                            <div className="text-[10px] text-slate-500 mb-1">
                              {loan.settledInstallments} / {loan.totalInstallments} paid ({progressPct}%)
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{width: `${progressPct}%`}}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                            {loan.nextDueDate ? formatDate(loan.nextDueDate) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
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
            <TablePagination
                page={loansPage}
                onPageChange={handlePageChange}
            />
          </div>
        </div>

        <LoanForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            bankAccounts={bankAccounts}
            onSuccess={handleLoanSuccess}
        />
      </div>
  );
}
