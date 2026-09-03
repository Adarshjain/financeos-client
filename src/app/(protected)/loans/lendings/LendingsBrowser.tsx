'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { LoansSummaryResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AddLendingDialog } from './browser/AddLendingDialog';
import { CounterpartiesList } from './browser/CounterpartiesList';
import { LendingsSummaryCards } from './browser/LendingsSummaryCards';
import { useLendingsBrowser } from './browser/useLendingsBrowser';

const EMPTY_SUMMARY: LoansSummaryResponse = {
  totalOutstanding: 0,
  activeLoanCount: 0,
  lentOutstanding: 0,
  borrowedOutstanding: 0,
  netReceivable: 0,
};

export function LendingsBrowser() {
  const { data: summaryData } = useQuery({
    queryKey: keys.loans.summary(),
    queryFn: async () =>
      (await api.GET('/api/v1/loans/summary')).data! as LoansSummaryResponse,
  });
  const summary = summaryData ?? EMPTY_SUMMARY;

  const {
    counterpartiesPage,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    selectedCpId,
    setSelectedCpId,
    newCpName,
    setNewCpName,
    direction,
    setDirection,
    amount,
    setAmount,
    entryDate,
    setEntryDate,
    expectedReturnDate,
    setExpectedReturnDate,
    notes,
    setNotes,
    txId,
    setTxId,
    loading,
    filteredContent,
    handlePageChange,
    handleDeleteCp,
    handleCreateLending,
  } = useLendingsBrowser();

  const renderActionBar = (isMobile = false) => (
    <div
      className={cn(
        'flex items-center gap-2 w-full',
        isMobile ? 'flex-row text-xs' : 'flex-wrap'
      )}
    >
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search person or notes..."
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

      <Button
        onClick={() => setCreateOpen(true)}
        size="sm"
        className="sm:hidden"
      >
        <Plus className="h-3.5 w-3.5" /> Add Lending
      </Button>
    </div>
  );

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-3 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Lendings Ledger ({counterpartiesPage.totalElements})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track person-to-person money lent out, borrowed, receivables, and
            payables
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" /> Add Lending
          </Button>
        </div>
      </div>

      {/* Action Bar / Search Filter Card */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Consolidated Summary Card */}
      <LendingsSummaryCards summary={summary} />

      {/* Ledger Container */}
      <CounterpartiesList
        page={counterpartiesPage}
        filteredContent={filteredContent}
        onPageChange={handlePageChange}
        onDeleteCp={handleDeleteCp}
      />

      {/* Add Lending Dialog */}
      <AddLendingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        counterparties={counterpartiesPage.content}
        selectedCpId={selectedCpId}
        setSelectedCpId={setSelectedCpId}
        newCpName={newCpName}
        setNewCpName={setNewCpName}
        direction={direction}
        setDirection={setDirection}
        amount={amount}
        setAmount={setAmount}
        entryDate={entryDate}
        setEntryDate={setEntryDate}
        expectedReturnDate={expectedReturnDate}
        setExpectedReturnDate={setExpectedReturnDate}
        notes={notes}
        setNotes={setNotes}
        txId={txId}
        setTxId={setTxId}
        loading={loading}
        onCreateLending={handleCreateLending}
      />
    </div>
  );
}
