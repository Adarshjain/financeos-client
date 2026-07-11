'use client';

import { ArrowLeft, Check, ChevronDown, Loader2, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { batchDeleteTransactions, batchReviewTransactions, searchTransactions } from '@/actions/transactions';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { MultiSelect } from '@/components/reports/MultiSelect';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction, ReviewReason } from '@/lib/transaction.types';
import { cn, formatDate } from '@/lib/utils';

import { TransactionCard } from './TransactionCard';

interface ReviewBrowserProps {
  accounts: Account[];
  categories: Category[];
}

export function ReviewBrowser({ accounts, categories }: ReviewBrowserProps) {
  // Draft (UI input) states
  const [draftAccountIds, setDraftAccountIds] = useState<string[]>(
    accounts.map((a) => a.id),
  );
  const [draftOnlyUpToLastStatement, setDraftOnlyUpToLastStatement] = useState(true);

  // Applied states (trigger fetching)
  const [appliedAccountIds, setAppliedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id),
  );
  const [appliedOnlyUpToLastStatement, setAppliedOnlyUpToLastStatement] = useState(true);

  const [showCutoffs, setShowCutoffs] = useState(false);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [pagedData, setPagedData] = useState<PagedTransaction | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
      txns.flatMap(t => t.reviewReasons || [])
    )) as ReviewReason[];
  }, [pagedData, selectedIds]);

  useEffect(() => {
    if (isApproveDialogOpen) {
      setReasonsToApprove(presentReasons);
    }
  }, [isApproveDialogOpen, presentReasons]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
  }));

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

  const handleApplyFilters = () => {
    setAppliedAccountIds(draftAccountIds);
    setAppliedOnlyUpToLastStatement(draftOnlyUpToLastStatement);
    setPage(0);
    setSelectedIds([]);
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
            skips: mappedSkips
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
            skips: []
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

  const selectedAccounts = accounts.filter((a) => appliedAccountIds.includes(a.id));

  return (
    <div className="space-y-2 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-4 pb-1">
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <Button variant="ghost" size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review Txns</h1>
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          className={`gap-2 rounded-xl transition-all ${
            showFilters
              ? 'bg-slate-100 dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
              : 'hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
        </Button>
      </div>

      {/* Configuration & Controls */}
      {showFilters && (
        <div
          className="mx-4 p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Account MultiSelect */}
            <div className="min-w-[200px] flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter Accounts
              </label>
              <MultiSelect
                options={accountOptions}
                value={draftAccountIds}
                onChange={(val) => {
                  setDraftAccountIds(val);
                }}
                placeholder="Select accounts…"
              />
            </div>

            {/* Cutoff Checkbox */}
            <div
              className="flex items-center space-x-2">
              <Checkbox
                id="statement-cutoff"
                checked={draftOnlyUpToLastStatement}
                onCheckedChange={(checked) => {
                  setDraftOnlyUpToLastStatement(!!checked);
                }}
              />
              <label
                htmlFor="statement-cutoff"
                className="text-xs font-semibold leading-none cursor-pointer select-none text-slate-700 dark:text-slate-350"
              >
                Only up to last statement date
              </label>
            </div>
          </div>

          {/* Apply Button */}
          <div className="min-w-[120px] flex-1 md:flex-initial self-end">
            <Button
              type="button"
              onClick={handleApplyFilters}
              className="w-full h-9.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              Apply Filters
            </Button>
          </div>

          {/* Selected Account Chips with cutoff info */}
          {selectedAccounts.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-900">
              <button
                type="button"
                onClick={() => setShowCutoffs(!showCutoffs)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
              >
                <span>Active Account Cutoffs</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', showCutoffs && 'rotate-180')} />
              </button>
              {showCutoffs && (
                <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in duration-200">
                  {selectedAccounts.map((account) => {
                    const lastStatementDate =
                      'lastStatementDate' in account ? account.lastStatementDate : null;
                    const dateStr = lastStatementDate
                      ? formatDate(lastStatementDate)
                      : 'No statement yet';
                    return (
                      <Badge
                        key={account.id}
                        variant="outline"
                        className="px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 font-medium"
                      >
                        {account.name}: {dateStr}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Sort controls */}
      <div className="px-4 py-2 flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search by description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 rounded-xl text-xs"
            aria-label="Search transactions by description"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort select */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort:</span>
          <Select
            value={sortBy}
            onValueChange={(val) => {
              setSortBy(val);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Sort transactions" className="w-[140px] h-9 rounded-xl text-xs font-semibold">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date,desc">Newest first</SelectItem>
              <SelectItem value="date,asc">Oldest first</SelectItem>
              <SelectItem value="amount,desc">Highest amount</SelectItem>
              <SelectItem value="amount,asc">Lowest amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statement cutoff warning note */}
      {appliedOnlyUpToLastStatement && hiddenCount > 0 && (
        <div className="mx-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Filter Active:</span>
            <span>{hiddenCount} {hiddenCount === 1 ? 'transaction is' : 'transactions are'} hidden by the statement filter</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedOnlyUpToLastStatement(false);
              setDraftOnlyUpToLastStatement(false);
              setPage(0);
            }}
            className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg transition-colors text-amber-900 dark:text-amber-200"
          >
            Show All
          </button>
        </div>
      )}

      {/* Reason Filter Chips */}
      <div className="px-4 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filter reasons:</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNRECONCILED', label: 'Unreconciled' },
            { id: 'CATEGORY_UNVERIFIED', label: 'Category' },
            { id: 'DUPLICATE_SUSPECT', label: 'Duplicate' },
          ].map((chip) => {
            const isActive = activeReasonFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setActiveReasonFilter(chip.id);
                  setPage(0);
                  setSelectedIds([]);
                }}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200',
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm'
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-900'
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List Container */}
      <div className="px-2 pb-24">
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
          <div className="space-y-1">
            {/* Master Checkbox Header */}
            <div className="flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mb-2 gap-3.5 shadow-sm">
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
                      className="text-lg font-medium pl-2 pb-1 pt-2 sticky top-0 bg-slate-50 dark:bg-slate-900 dark:text-slate-350 z-10">
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
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
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
      </div>

      {/* Sticky Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div
          className="fixed bottom-16 left-3 right-3 lg:left-[calc(50%+8rem)] lg:right-auto lg:-translate-x-1/2 lg:w-auto z-50 flex items-center justify-between lg:justify-start gap-4 px-5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
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
              <p className="text-xs text-slate-500 italic">No specific review reasons found on selected transactions.</p>
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
            <Button variant="outline" size="sm" className="text-xs rounded-xl" onClick={() => setIsApproveDialogOpen(false)}>
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
      <Dialog open={summaryData !== null} onOpenChange={(open) => { if (!open) setSummaryData(null); }}>
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
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <span className="block text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {summaryData?.succeededCount || 0}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-bold uppercase tracking-wider">
                  Succeeded
                </span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <span className="block text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {summaryData?.skippedCount || 0}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-500 font-bold uppercase tracking-wider">
                  Skipped
                </span>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
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
                <ul className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
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
                <ul className="text-xs space-y-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {summaryData.failures.map((f, idx) => (
                    <li key={idx} className="text-slate-700 dark:text-slate-300">
                      <span className="font-semibold block truncate text-rose-600 dark:text-rose-400">• {f.description}</span>
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
