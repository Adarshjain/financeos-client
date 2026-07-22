'use client';

import { ArrowLeft, Check, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { batchDeleteTransactions, batchReviewTransactions, searchTransactions } from '@/actions/transactions';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction, ReviewReason } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

import { ReviewFilterBar } from './ReviewFilterBar';
import { TransactionCard } from './TransactionCard';

interface ReviewBrowserProps {
  accounts: Account[];
  categories: Category[];
}

export function ReviewBrowser({ accounts, categories }: ReviewBrowserProps) {
  // Applied states (trigger fetching)
  const [appliedAccountIds, setAppliedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id),
  );
  const [appliedOnlyUpToLastStatement, setAppliedOnlyUpToLastStatement] = useState(true);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [pagedData, setPagedData] = useState<PagedTransaction | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [activeReasonFilter, setActiveReasonFilter] = useState<string>('ALL');
  const runIdRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('date,desc');
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [reasonsToApprove, setReasonsToApprove] = useState<ReviewReason[]>([]);
  const [summaryData, setSummaryData] = useState<{
    succeededCount: number;
    skippedCount: number;
    failures: { description: string; reason: string }[];
    skips: string[];
  } | null>(null);

  const presentReasons = useMemo(() => {
    const txns = pagedData?.content.filter(t => selectedIds.includes(t.id)) || [];
    return Array.from(new Set(
      txns.flatMap(t => t.reviewReasons || []),
    )) as ReviewReason[];
  }, [pagedData, selectedIds]);

  useEffect(() => {
    if (isApproveDialogOpen) {
      setReasonsToApprove(presentReasons);
    }
  }, [isApproveDialogOpen, presentReasons]);

  const fetchTransactions = useCallback(async (currentPage: number, runId: number) => {
    if (appliedAccountIds.length === 0) {
      if (runId === runIdRef.current) {
        setPagedData({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: 0,
          first: true,
          last: true,
          empty: true,
        });
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const filters: FilterClause[] = [
        { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
      ];

      if (activeReasonFilter !== 'ALL') {
        filters.push({
          field: 'reviewReason',
          operator: 'is',
          value: activeReasonFilter,
        });
      }

      if (appliedAccountIds.length < accounts.length) {
        filters.push({
          field: 'accountId',
          operator: 'in',
          value: appliedAccountIds,
        });
      }

      if (appliedOnlyUpToLastStatement) {
        filters.push({
          field: 'coveredByStatement',
          operator: 'is',
          value: true,
        });
      }

      const res = await searchTransactions(
        {
          filters,
          search: debouncedSearch || null,
        },
        currentPage,
        size,
        sortBy,
      );

      if (runId !== runIdRef.current) return;

      if (res.success) {
        setPagedData(res.data);
        if (res.data.content.length === 0 && res.data.totalElements > 0 && currentPage > 0) {
          setPage(currentPage - 1);
          return;
        }
        const visibleIds = new Set(res.data.content.map((t) => t.id));
        setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));

        let unfilteredTotal = res.data.totalElements;
        if (appliedOnlyUpToLastStatement) {
          const unfilteredFilters: FilterClause[] = [
            { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
          ];

          if (activeReasonFilter !== 'ALL') {
            unfilteredFilters.push({
              field: 'reviewReason',
              operator: 'is',
              value: activeReasonFilter,
            });
          }

          if (appliedAccountIds.length < accounts.length) {
            unfilteredFilters.push({
              field: 'accountId',
              operator: 'in',
              value: appliedAccountIds,
            });
          }

          const unfilteredRes = await searchTransactions(
            {
              filters: unfilteredFilters,
              search: debouncedSearch || null,
            },
            0,
            1,
            sortBy,
          );

          if (runId !== runIdRef.current) return;

          if (unfilteredRes.success) {
            unfilteredTotal = unfilteredRes.data.totalElements;
          }
        }
        setHiddenCount(Math.max(0, unfilteredTotal - res.data.totalElements));
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      if (runId === runIdRef.current) {
        setLoading(false);
      }
    }
  }, [accounts.length, appliedAccountIds, appliedOnlyUpToLastStatement, activeReasonFilter, size, debouncedSearch, sortBy]);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const timer = setTimeout(() => {
      fetchTransactions(page, runId);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, activeReasonFilter, fetchTransactions]);

  const handleReload = () => {
    const runId = ++runIdRef.current;
    fetchTransactions(page, runId);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBatchApprove = async () => {
    setBatchActionLoading(true);
    try {
      const res = await batchReviewTransactions(selectedIds, 'MANUALLY_REVIEWED', reasonsToApprove);
      if (res.success) {
        const { succeededIds, skippedIds, failures } = res.data;

        const mappedFailures = failures.map(f => {
          const txn = pagedData?.content.find(t => t.id === f.id);
          const desc = txn ? (txn.description || txn.sourcedDescription) : `Transaction ID: ${f.id}`;
          let friendlyReason = f.reason;
          if (f.reason === 'NOT_FOUND') {
            friendlyReason = 'Transaction not found';
          } else if (f.reason === 'NOT_OWNED') {
            friendlyReason = 'Access denied (not owned)';
          } else if (f.reason === 'ERROR') {
            friendlyReason = 'System error occurred';
          }
          return { description: desc, reason: friendlyReason };
        });

        const mappedSkips = skippedIds.map(id => {
          const txn = pagedData?.content.find(t => t.id === id);
          return txn ? (txn.description || txn.sourcedDescription) : `Transaction ID: ${id}`;
        });

        if (failures.length > 0 || skippedIds.length > 0) {
          setSummaryData({
            succeededCount: succeededIds.length,
            skippedCount: skippedIds.length,
            failures: mappedFailures,
            skips: mappedSkips,
          });
        } else {
          toast.success(`Successfully approved ${succeededIds.length} transaction(s)!`);
        }
        setSelectedIds([]);
        handleReload();
        setIsApproveDialogOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('An error occurred during batch approval.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchActionLoading(true);
    try {
      const res = await batchDeleteTransactions(selectedIds);
      if (res.success) {
        const { succeededIds, failures } = res.data;

        const mappedFailures = failures.map(f => {
          const txn = pagedData?.content.find(t => t.id === f.id);
          const desc = txn ? (txn.description || txn.sourcedDescription) : `Transaction ID: ${f.id}`;
          let friendlyReason = f.reason;
          if (f.reason === 'NOT_FOUND') {
            friendlyReason = 'Transaction not found';
          } else if (f.reason === 'NOT_OWNED') {
            friendlyReason = 'Access denied (not owned)';
          } else if (f.reason === 'ERROR') {
            friendlyReason = 'System error occurred';
          }
          return { description: desc, reason: friendlyReason };
        });

        if (failures.length > 0) {
          setSummaryData({
            succeededCount: succeededIds.length,
            skippedCount: 0,
            failures: mappedFailures,
            skips: [],
          });
        } else {
          toast.success(`Successfully deleted ${succeededIds.length} transaction(s)!`);
        }
        setSelectedIds([]);
        handleReload();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('An error occurred during batch deletion.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  return (
    <div className="space-y-1 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <Link href="/transactions">
            <Button variant="ghost" size="icon"
                    className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 text-slate-500" />
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Review Txns</h1>
        </div>
      </div>

      {/* Mobile-First Review Filter Bar */}
      <ReviewFilterBar
        accounts={accounts}
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

      {/* Statement cutoff warning note */}
      {appliedOnlyUpToLastStatement && hiddenCount > 0 && (
        <div
          className="mx-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Filter Active:</span>
            <span>{hiddenCount} {hiddenCount === 1 ? 'transaction is' : 'transactions are'} hidden by the statement filter</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedOnlyUpToLastStatement(false);
              setPage(0);
            }}
            className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg transition-colors text-amber-900 dark:text-amber-200"
          >
            Show All
          </button>
        </div>
      )}

      {/* List Container */}
      {loading && !pagedData ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p className="text-sm">Loading transactions for review...</p>
        </div>
      ) : !pagedData || pagedData.content.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
            No transactions need review
          </p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {appliedAccountIds.length < accounts.length
              ? 'Try adjusting your account selection to find pending transactions.'
              : 'All transactions for the selected periods have been verified!'}
          </p>
        </div>
      ) : (
        <div className="space-y-1 px-2">
          {/* Master Checkbox Header */}
          <div className="flex items-center mb-2 gap-3.5 px-3 pt-1">
            <Checkbox
              id="select-all-page"
              checked={
                pagedData.content.length > 0 &&
                pagedData.content.every((t) => selectedIds.includes(t.id))
                  ? true
                  : pagedData.content.some((t) => selectedIds.includes(t.id))
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={(checked) => {
                if (checked === true) {
                  const pageIds = pagedData.content.map((t) => t.id);
                  setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
                } else {
                  const pageIds = pagedData.content.map((t) => t.id);
                  setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
                }
              }}
            />
            <label
              htmlFor="select-all-page"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
            >
              Select All on Page
            </label>
          </div>
          {pagedData.content.map((transaction, index) => {
            const showDate =
              index === 0 || transaction.date !== pagedData.content[index - 1].date;
            return (
              <Fragment key={transaction.id}>
                {showDate && (
                  <div
                    className="text-sm font-medium pl-2 pt-2 sticky top-0 bg-slate-50 dark:bg-slate-900 dark:text-slate-300 z-10">
                    {formatDate(transaction.date)}
                  </div>
                )}
                <TransactionCard
                  categories={categories}
                  accounts={accounts}
                  transaction={transaction}
                  onMutate={handleReload}
                  selectable
                  selected={selectedIds.includes(transaction.id)}
                  onToggleSelect={() => toggleSelect(transaction.id)}
                  showSource
                />
              </Fragment>
            );
          })}

          {/* Pagination */}
          <div
            className="fixed bottom-2 left-3 right-3 lg:left-[calc(50%+8rem)] lg:right-auto lg:-translate-x-1/2 lg:w-auto z-50 flex items-center justify-between lg:justify-start gap-4 px-5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/*<div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white z-10">*/}
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
        </div>
      )}

      {/* Sticky Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div
          className="fixed bottom-[100px] left-3 right-3 lg:left-[calc(50%+8rem)] lg:right-auto lg:-translate-x-1/2 lg:w-auto z-50 flex items-center justify-between lg:justify-start gap-4 px-5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <span className="text-xs font-semibold whitespace-nowrap pl-1">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={batchActionLoading}
              onClick={() => setIsApproveDialogOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-350 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors h-auto shadow-none gap-1.5 flex items-center"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Approve</span>
            </Button>
            <ConfirmationDialog
              title="Delete Transactions?"
              description={`Are you sure you want to permanently delete these ${selectedIds.length} transaction${selectedIds.length === 1 ? '' : 's'}? This action is permanent and cannot be undone.`}
              primaryActionText={batchActionLoading ? 'Deleting...' : 'Delete'}
              primaryAction={handleBatchDelete}
              loading={batchActionLoading}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={batchActionLoading}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-350 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors h-auto shadow-none gap-1.5 flex items-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Approve Transactions</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Select which review reasons you want to clear from the {selectedIds.length} selected transaction(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {presentReasons.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No specific review reasons found on selected
                transactions.</p>
            ) : (
              presentReasons.map((reason) => {
                let label: string = reason;
                if (reason === 'UNRECONCILED') label = 'Unreconciled';
                else if (reason === 'CATEGORY_UNVERIFIED') label = 'Category unverified';
                else if (reason === 'DUPLICATE_SUSPECT') label = 'Possible duplicate';

                const isChecked = reasonsToApprove.includes(reason);
                return (
                  <div key={reason} className="flex items-center space-x-2">
                    <Checkbox
                      id={`reason-${reason}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setReasonsToApprove([...reasonsToApprove, reason]);
                        } else {
                          setReasonsToApprove(reasonsToApprove.filter(r => r !== reason));
                        }
                      }}
                    />
                    <label
                      htmlFor={`reason-${reason}`}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                    >
                      {label}
                    </label>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs rounded-xl"
                    onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl"
              size="sm"
              disabled={reasonsToApprove.length === 0 || batchActionLoading}
              onClick={handleBatchApprove}
            >
              {batchActionLoading ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Summary Dialog */}
      <Dialog open={summaryData !== null} onOpenChange={(open) => {
        if (!open) setSummaryData(null);
      }}>
        <DialogContent className="sm:max-w-[480px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Batch Action Summary</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              The batch operation completed with the following results:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Counts */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div
                className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <span className="block text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {summaryData?.succeededCount || 0}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-bold uppercase tracking-wider">
                  Succeeded
                </span>
              </div>
              <div
                className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <span className="block text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {summaryData?.skippedCount || 0}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-500 font-bold uppercase tracking-wider">
                  Skipped
                </span>
              </div>
              <div
                className="bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <span className="block text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {summaryData?.failures?.length || 0}
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-500 font-bold uppercase tracking-wider">
                  Failed
                </span>
              </div>
            </div>

            {/* Skips list */}
            {summaryData && summaryData.skips && summaryData.skips.length > 0 && (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Skipped Rows (no reasons matched):</span>
                <ul
                  className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {summaryData.skips.map((desc, idx) => (
                    <li key={idx} className="truncate text-slate-600 dark:text-slate-400">
                      • {desc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failures list */}
            {summaryData && summaryData.failures && summaryData.failures.length > 0 && (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Failed Rows:</span>
                <ul
                  className="text-xs space-y-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {summaryData.failures.map((f, idx) => (
                    <li key={idx} className="text-slate-700 dark:text-slate-300">
                      <span
                        className="font-semibold block truncate text-rose-600 dark:text-rose-400">• {f.description}</span>
                      <span className="text-[10px] text-slate-400 pl-3">Reason: {f.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-xl"
              onClick={() => setSummaryData(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
