'use client';

import { Plus, Search, X } from 'lucide-react';

import { LoanForm } from '@/app/(protected)/loans/LoanForm';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type { Page } from '@/lib/pagination';
import type { LoanResponse, LoansSummaryResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

import { LoansList } from './browser/LoansList';
import { LoansSummaryCards } from './browser/LoansSummaryCards';
import { useLoansBrowser } from './browser/useLoansBrowser';

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
  const {
    loansPage,
    statusFilter,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    filteredContent,
    totalMonthlyEmi,
    handleFilterChange,
    handlePageChange,
    handleLoanSuccess,
  } = useLoansBrowser({
    initialLoans,
  });

  const renderActionBar = (isMobile = false) => (
    <div
      className={cn(
        'flex items-center gap-2 w-full',
        isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-wrap'
      )}
    >
      <div className="relative flex-1 min-w-[180px] w-full">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loans or lenders..."
          className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-full sm:w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="foreclosed">Foreclosed</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="shrink-0 sm:hidden"
        >
          <Plus className="h-3.5 w-3.5" /> Add Loan
        </Button>
      </div>
    </div>
  );

  return (
    <div className="pb-32 p-3 sm:p-6 space-y-3 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Formal Loans ({loansPage.totalElements})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage bank loans, mortgages, amortization schedules, EMIs, and
            effective APR
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" /> Add Loan
          </Button>
        </div>
      </div>

      {/* Action Bar / Search Filter Card */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Consolidated Summary Card */}
      <LoansSummaryCards
        summary={summary}
        totalMonthlyEmi={totalMonthlyEmi}
      />

      {/* Main Table / List Container */}
      <LoansList
        page={loansPage}
        filteredContent={filteredContent}
        onPageChange={handlePageChange}
      />

      <LoanForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        bankAccounts={bankAccounts}
        onSuccess={handleLoanSuccess}
      />
    </div>
  );
}
