'use client';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Card } from '@/components/ui/card';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { cn } from '@/lib/utils';

import { MergeTransactionsDialog } from './MergeTransactionsDialog';
import { ReviewApproveDialog } from './review-browser/ReviewApproveDialog';
import { ReviewBatchSummaryDialog } from './review-browser/ReviewBatchSummaryDialog';
import { ReviewBulkActionBar } from './review-browser/ReviewBulkActionBar';
import { ReviewListContainer } from './review-browser/ReviewListContainer';
import { useReviewBrowser } from './review-browser/useReviewBrowser';
import { ReviewFilterBar } from './ReviewFilterBar';

export function ReviewBrowser() {
  const { data: accounts = [] } = useAccounts();
  const {
    selectableAccounts,
    appliedAccountIds,
    setAppliedAccountIds,
    appliedOnlyUpToLastStatement,
    setAppliedOnlyUpToLastStatement,
    page,
    setPage,
    size,
    setSize,
    loading,
    pagedData,
    selectedIds,
    setSelectedIds,
    batchActionLoading,
    activeReasonFilter,
    setActiveReasonFilter,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    hiddenCount,
    isApproveDialogOpen,
    setIsApproveDialogOpen,
    isMergeDialogOpen,
    setIsMergeDialogOpen,
    reasonsToApprove,
    setReasonsToApprove,
    summaryData,
    setSummaryData,
    selectedTxns,
    presentReasons,
    handleReload,
    handlePageChange,
    toggleSelect,
    handleSelectAllPage,
    handleBatchApprove,
    handleBatchDelete,
  } = useReviewBrowser(accounts);

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex flex-col gap-2 w-full', isMobile ? 'text-xs' : '')}>
      <ReviewFilterBar
        appliedAccountIds={appliedAccountIds}
        onAccountIdsChange={(nextIds) => {
          setAppliedAccountIds(nextIds);
          setPage(0);
          setSelectedIds([]);
        }}
        onlyUpToLastStatement={appliedOnlyUpToLastStatement}
        onOnlyUpToLastStatementChange={(nextVal) => {
          setAppliedOnlyUpToLastStatement(nextVal);
          setPage(0);
          setSelectedIds([]);
        }}
        activeReasonFilter={activeReasonFilter}
        onReasonFilterChange={(nextReason) => {
          setActiveReasonFilter(nextReason);
          setPage(0);
          setSelectedIds([]);
        }}
        search={searchTerm}
        onSearchChange={(nextSearch) => {
          setSearchTerm(nextSearch);
          setPage(0);
        }}
        sortBy={sortBy}
        onSortByChange={(nextSort) => {
          setSortBy(nextSort);
          setPage(0);
        }}
      />

      {pagedData && pagedData.totalElements > 0 && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <TablePagination
            page={{
              number: pagedData.number,
              size: pagedData.size,
              totalElements: pagedData.totalElements,
              totalPages: pagedData.totalPages,
            }}
            onPageChange={handlePageChange}
            onSizeChange={(newSize) => {
              setSize(newSize);
              setPage(0);
              setSelectedIds([]);
            }}
            unit="transaction"
            loading={loading}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-2.5 pb-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Review Transactions
        </h1>
      </div>

      {/* Desktop Action Bar Container — swaps to bulk actions while a selection is active */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3 mx-2">
        {selectedIds.length > 0 ? (
          <ReviewBulkActionBar
            selectedCount={selectedIds.length}
            batchActionLoading={batchActionLoading}
            onOpenMerge={() => setIsMergeDialogOpen(true)}
            onOpenApprove={() => setIsApproveDialogOpen(true)}
            onBatchDelete={handleBatchDelete}
          />
        ) : (
          renderActionBar(false)
        )}
      </Card>

      {/* Mobile PageActionBar Integration — swaps to bulk actions while a selection is active */}
      <PageActionBar
        hideOnScroll={selectedIds.length === 0}
        trigger={
          selectedIds.length > 0 ? (
            <span className="text-xs font-semibold whitespace-nowrap">
              {selectedIds.length} selected
            </span>
          ) : undefined
        }
      >
        {selectedIds.length > 0 ? (
          <ReviewBulkActionBar
            selectedCount={selectedIds.length}
            batchActionLoading={batchActionLoading}
            onOpenMerge={() => setIsMergeDialogOpen(true)}
            onOpenApprove={() => setIsApproveDialogOpen(true)}
            onBatchDelete={handleBatchDelete}
          />
        ) : (
          renderActionBar(true)
        )}
      </PageActionBar>

      {/* Statement cutoff warning note */}
      {appliedOnlyUpToLastStatement && hiddenCount > 0 && (
        <div className="mx-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Filter Active:</span>
            <span>
              {hiddenCount} {hiddenCount === 1 ? 'transaction is' : 'transactions are'} hidden by the
              statement filter
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedOnlyUpToLastStatement(false);
              setPage(0);
            }}
            className="text-2xs font-bold uppercase tracking-wider bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg transition-colors text-amber-900 dark:text-amber-200"
          >
            Show All
          </button>
        </div>
      )}

      {/* List Container */}
      <ReviewListContainer
        loading={loading}
        pagedData={pagedData}
        selectedIds={selectedIds}
        appliedAccountCount={appliedAccountIds.length}
        selectableAccountCount={selectableAccounts.length}
        accounts={accounts}
        onSelectAllPage={handleSelectAllPage}
        onToggleSelect={toggleSelect}
        onMutate={handleReload}
      />

      {/* Approve Dialog */}
      <ReviewApproveDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        selectedCount={selectedIds.length}
        presentReasons={presentReasons}
        reasonsToApprove={reasonsToApprove}
        setReasonsToApprove={setReasonsToApprove}
        batchActionLoading={batchActionLoading}
        onBatchApprove={handleBatchApprove}
      />

      {/* Batch Summary Dialog */}
      <ReviewBatchSummaryDialog
        summaryData={summaryData}
        onClose={() => setSummaryData(null)}
      />

      {/* Merge Dialog */}
      {selectedTxns.length === 2 && (
        <MergeTransactionsDialog
          open={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          tx1={selectedTxns[0]}
          tx2={selectedTxns[1]}
          accounts={accounts}
          onSuccess={() => {
            setSelectedIds([]);
            handleReload();
          }}
        />
      )}
    </div>
  );
}
