'use client';

import { Link2, PlusIcon } from 'lucide-react';
import Link from 'next/link';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { cn } from '@/lib/utils';

import { TransactionListFeed } from './browser/TransactionListFeed';
import { TransactionSortToolbar } from './browser/TransactionSortToolbar';
import { useTransactionsBrowser } from './browser/useTransactionsBrowser';
import { TransactionFilterBar } from './TransactionFilterBar';
import { TransactionFormWrapper } from './TransactionFormWrapper';
import { TransactionLinkDialog } from './TransactionLinkDialog';

interface TransactionsBrowserProps {
  accounts: Account[];
  categories: Category[];
  /** `null`/absent means the count could not be determined, not zero. */
  needsReviewCount?: number | null;
}

export function TransactionsBrowser({
  accounts,
  categories,
  needsReviewCount,
}: TransactionsBrowserProps) {
  const {
    appliedFilters,
    setAppliedFilters,
    search,
    setSearch,
    sort,
    localReviewCount,
    selectedTxnIds,
    setSelectedTxnIds,
    isSelectionMode,
    setIsSelectionMode,
    bulkLinkOpen,
    setBulkLinkOpen,
    page,
    setPage,
    size,
    setSize,
    loading,
    pagedData,
    toggleSelect,
    selectedTransactions,
    handleReload,
    handleSort,
  } = useTransactionsBrowser(needsReviewCount);

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex flex-col gap-2 w-full', isMobile ? 'text-xs' : '')}>
      {/* Search & Filter Bar */}
      <TransactionFilterBar
        accounts={accounts}
        categories={categories}
        appliedFilters={appliedFilters}
        onFiltersChange={(nextFilters) => {
          setAppliedFilters(nextFilters);
          setPage(0);
        }}
        search={search}
        onSearchChange={(nextSearch) => {
          setSearch(nextSearch);
          setPage(0);
        }}
      />

      {/* Pagination Footer */}
      {pagedData && pagedData.totalElements > 0 && (
        <TablePagination
          page={{
            number: pagedData.number,
            size: pagedData.size,
            totalElements: pagedData.totalElements,
            totalPages: pagedData.totalPages,
          }}
          onPageChange={setPage}
          onSizeChange={(newSize) => {
            setSize(newSize);
            setPage(0);
          }}
          loading={loading}
          unit="txn"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-1 pb-16">
      {/* Page Header with Review and Create buttons */}
      <div className="flex justify-between items-center px-4 pt-2.5 pb-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Transactions
        </h1>
        <div className="flex items-center gap-2">
          {selectedTxnIds.size > 0 ? (
            <Button
              variant="outline"
              onClick={() => setBulkLinkOpen(true)}
              className="border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Link ({selectedTxnIds.size})</span>
            </Button>
          ) : (
            <>
              {localReviewCount != null && localReviewCount > 0 && (
                <Link href="/transactions/review">
                  <Button variant="outline" className="relative">
                    <span>Review</span>
                    {localReviewCount !== null && localReviewCount > 0 && (
                      <span className="flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-md bg-amber-500 text-2xs font-bold text-white">
                        {localReviewCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              <TransactionFormWrapper
                categories={categories}
                accounts={accounts}
                onSuccess={handleReload}
                trigger={
                  <Button size="sm">
                    <PlusIcon className="w-4" data-icon="inline-end" />
                    Create
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3 mx-2">
        {renderActionBar(false)}
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar defaultCollapsed trigger={<span>Filters</span>}>
        {renderActionBar(true)}
      </PageActionBar>

      {/* Sort Toolbar */}
      <TransactionSortToolbar
        sort={sort}
        onSort={handleSort}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        selectedTxnIds={selectedTxnIds}
        setSelectedTxnIds={setSelectedTxnIds}
        loading={loading}
        pagedData={pagedData}
      />

      {/* Transactions List */}
      <div className="px-2">
        <TransactionListFeed
          loading={loading}
          pagedData={pagedData}
          hasFiltersOrSearch={appliedFilters.length > 0 || search.trim() !== ''}
          categories={categories}
          accounts={accounts}
          isSelectionMode={isSelectionMode}
          selectedTxnIds={selectedTxnIds}
          onReload={handleReload}
          onToggleSelect={toggleSelect}
        />
      </div>

      <TransactionLinkDialog
        initialSelectedTransactions={selectedTransactions}
        accounts={accounts}
        open={bulkLinkOpen}
        onOpenChange={setBulkLinkOpen}
        onSuccess={() => {
          setSelectedTxnIds(new Set());
          handleReload();
        }}
      />
    </div>
  );
}
