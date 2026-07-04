'use client';

import { ArrowLeft, Check, ChevronDown, Loader2, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { batchDeleteTransactions, batchReviewTransactions, searchTransactions } from '@/actions/transactions';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { MultiSelect } from '@/components/reports/MultiSelect';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction } from '@/lib/transaction.types';
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
  const runIdRef = useRef(0);

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

    const filters: FilterClause[] = [
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
    ];

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
        search: null,
      },
      currentPage,
      size,
      'date,desc',
    );

    if (runId !== runIdRef.current) return;

    if (res.success) {
      setPagedData(res.data);
      const visibleIds = new Set(res.data.content.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
  }, [accounts.length, appliedAccountIds, appliedOnlyUpToLastStatement, size]);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const timer = setTimeout(() => {
      fetchTransactions(page, runId);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, fetchTransactions]);

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
      const res = await batchReviewTransactions(selectedIds, 'MANUALLY_REVIEWED');
      if (res.success) {
        toast.success(`Successfully approved ${res.data.updated} transaction(s)!`);
        setSelectedIds([]);
        handleReload();
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
        toast.success(`Successfully deleted ${res.data.deleted} transaction(s)!`);
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
            <ConfirmationDialog
              title="Approve Transactions?"
              description={`Are you sure you want to approve these ${selectedIds.length} transaction${selectedIds.length === 1 ? '' : 's'}? They will be marked as manually reviewed.`}
              primaryActionText={batchActionLoading ? 'Approving...' : 'Approve'}
              primaryAction={handleBatchApprove}
              loading={batchActionLoading}
              variant="default"
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={batchActionLoading}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-350 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors h-auto shadow-none gap-1.5 flex items-center"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </Button>
              }
            />
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
    </div>
  );
}
