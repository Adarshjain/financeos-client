'use client';

import { Link2, PlusIcon, X } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { PagedSection } from '@/components/reports/views/PagedSection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { cn } from '@/lib/utils';

import { TransactionListFeed } from './browser/TransactionListFeed';
import { TransactionSortToolbar } from './browser/TransactionSortToolbar';
import { useTransactionsBrowser } from './browser/useTransactionsBrowser';
import { TransactionFilterBar } from './TransactionFilterBar';
import { TransactionFormWrapper } from './TransactionFormWrapper';
import { TransactionLinkDialog } from './TransactionLinkDialog';

export function TransactionsBrowser() {
  const { data: accounts = [] } = useAccounts();
  const {
    appliedFilters,
    setAppliedFilters,
    search,
    setSearch,
    sort,
    selectedTxnIds,
    setSelectedTxnIds,
    isSelectionMode,
    setIsSelectionMode,
    bulkLinkOpen,
    setBulkLinkOpen,
    setPage,
    size,
    setSize,
    loading,
    pagedData,
    toggleSelect,
    selectedTransactions,
    handleReload,
    handleSortFieldChange,
    handleSortDirectionToggle,
  } = useTransactionsBrowser();

  const exitSelection = () => {
    setSelectedTxnIds(new Set());
    setIsSelectionMode(false);
  };

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex flex-col gap-2 w-full', isMobile ? 'text-xs' : '')}>
      {/* Search & Filter Bar */}
      <TransactionFilterBar
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
    </div>
  );

  return (
    <div className="space-y-1 pb-16">
      {/* Page Header: Link (pick transactions to link) and Create */}
      <div className="flex justify-between items-center px-4 pt-2.5 pb-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Transactions
        </h1>
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <Button variant="outline" size="sm" onClick={exitSelection}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={selectedTxnIds.size === 0}
                onClick={() => setBulkLinkOpen(true)}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Link ({selectedTxnIds.size})</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
                <Link2 className="h-3.5 w-3.5" />
                <span>Link</span>
              </Button>
              <TransactionFormWrapper
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

      {/* Sort bar carrying the top pager, the list, and the bottom pager */}
      <PagedSection
        topClassName="justify-end sm:justify-between"
        bottomClassName="px-4 pt-2"
        renderTop={(pager) => (
          <TransactionSortToolbar
            sort={sort}
            onSortFieldChange={handleSortFieldChange}
            onToggleSortDirection={handleSortDirectionToggle}
            loading={loading}
            pager={pager}
          />
        )}
        page={{
          number: pagedData?.number ?? 0,
          size: pagedData?.size ?? size,
          totalElements: pagedData?.totalElements ?? 0,
          totalPages: pagedData?.totalPages ?? 0,
        }}
        onPageChange={setPage}
        onSizeChange={(newSize) => {
          setSize(newSize);
          setPage(0);
        }}
        loading={loading}
        unit="txn"
        phoneCompact
      >
        <div className="px-2 pt-1">
          <TransactionListFeed
            loading={loading}
            pagedData={pagedData}
            hasFiltersOrSearch={appliedFilters.length > 0 || search.trim() !== ''}
            accounts={accounts}
            isSelectionMode={isSelectionMode}
            selectedTxnIds={selectedTxnIds}
            onReload={handleReload}
            onToggleSelect={toggleSelect}
          />
        </div>
      </PagedSection>

      <TransactionLinkDialog
        initialSelectedTransactions={selectedTransactions}
        accounts={accounts}
        open={bulkLinkOpen}
        onOpenChange={setBulkLinkOpen}
        onSuccess={() => {
          exitSelection();
          handleReload();
        }}
      />
    </div>
  );
}
