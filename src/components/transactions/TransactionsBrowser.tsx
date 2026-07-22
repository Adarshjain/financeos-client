'use client';

import { ArrowDown, ArrowUp, Link2, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { searchTransactions } from '@/actions/transactions';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction, Transaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

import { TRANSACTIONS_CATALOG } from './catalog';
import { TransactionCard } from './TransactionCard';
import { TransactionFilterBar } from './TransactionFilterBar';
import { TransactionFormWrapper } from './TransactionFormWrapper';
import { TransactionLinkDialog } from './TransactionLinkDialog';

interface TransactionsBrowserProps {
  accounts: Account[];
  categories: Category[];
  needsReviewCount?: number;
}

export function TransactionsBrowser({ accounts, categories, needsReviewCount }: TransactionsBrowserProps) {
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('date,desc');
  const [localReviewCount, setLocalReviewCount] = useState(needsReviewCount ?? 0);

  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false);

  useEffect(() => {
    setLocalReviewCount(needsReviewCount ?? 0);
  }, [needsReviewCount]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [pagedData, setPagedData] = useState<PagedTransaction | null>(null);
  const runIdRef = useRef(0);

  const toggleSelect = (id: string) => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedTransactions = (pagedData?.content || []).filter((t) => selectedTxnIds.has(t.id));

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchReviewCount = useCallback(async (runId: number) => {
    try {
      const reviewRes = await searchTransactions(
        {
          filters: [{ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' }],
          search: null,
        },
        0,
        1,
      );
      if (runId === runIdRef.current && reviewRes.success) {
        setLocalReviewCount(reviewRes.data.totalElements);
      }
    } catch {
      // Ignore background errors
    }
  }, []);

  const fetchTransactions = useCallback(async (currentPage: number, runId: number) => {
    setLoading(true);
    try {
      const cleanFiltersList = appliedFilters.filter((clause) => {
        const fieldDef = TRANSACTIONS_CATALOG.fields.find((f) => f.name === clause.field);
        if (!fieldDef || !clause.operator) return false;
        const v = clause.value;

        const op = clause.operator;
        const isRelativeValueless = [
          'this_month',
          'this_week',
          'this_year',
          'previous_month',
          'previous_week',
          'previous_year',
          'today',
          'yesterday',
          'current_fy',
          'prev_fy',
          'all_time',
        ].includes(op);

        if (isRelativeValueless) return true;

        if (op === 'between') {
          if (!v || typeof v !== 'object') return false;
          if (fieldDef.type === 'number') {
            const r = v as { from: number; to: number };
            return Number.isFinite(r.from) && Number.isFinite(r.to);
          } else if (fieldDef.type === 'date') {
            const r = v as { from: string; to: string };
            return r.from !== '' && r.to !== '';
          }
          return false;
        }

        if (['last_x_days', 'last_x_months', 'last_x_years'].includes(op)) {
          if (!v || typeof v !== 'object' || !('amount' in v)) return false;
          return Number.isFinite((v as { amount: number }).amount);
        }

        if (fieldDef.type === 'boolean') {
          return typeof v === 'boolean';
        }

        if (Array.isArray(v)) {
          return v.length > 0;
        }

        return v !== undefined && v !== null && v !== '';
      });

      const res = await searchTransactions(
        {
          filters: cleanFiltersList,
          search: debouncedSearch.trim() || null,
        },
        currentPage,
        size,
        sort,
      );

      if (runId !== runIdRef.current) return;

      if (res.success) {
        setPagedData(res.data);
        if (res.data.content.length === 0 && res.data.totalElements > 0 && currentPage > 0) {
          setPage(currentPage - 1);
          return;
        }
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
  }, [appliedFilters, debouncedSearch, size, sort]);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const timer = setTimeout(() => {
      fetchTransactions(page, runId);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, fetchTransactions]);

  useEffect(() => {
    const runId = runIdRef.current;
    fetchReviewCount(runId);
  }, [fetchReviewCount]);

  const handleReload = () => {
    const runId = ++runIdRef.current;
    fetchTransactions(page, runId);
    fetchReviewCount(runId);
  };

  const handleSort = (field: string) => {
    const currentField = sort.split(',')[0];
    const currentDir = sort.split(',')[1];
    let nextDir = 'desc';
    if (currentField === field) {
      nextDir = currentDir === 'desc' ? 'asc' : 'desc';
    }
    setSort(`${field},${nextDir}`);
    setPage(0);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center px-4 pt-2.5 pb-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <div className="flex items-center gap-2">
          {selectedTxnIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkLinkOpen(true)}
              className="gap-1.5 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl h-8 text-xs font-semibold"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Link ({selectedTxnIds.size})</span>
            </Button>
          )}
          <Link href="/transactions/review">
            <Button variant="outline" size="sm" className="relative gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all h-8 text-xs">
              <span>Review</span>
              {localReviewCount !== undefined && localReviewCount > 0 && (
                <span className="flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-md bg-amber-500 text-[10px] font-bold text-white">
                  {localReviewCount}
                </span>
              )}
            </Button>
          </Link>
          <TransactionFormWrapper
            categories={categories}
            accounts={accounts}
            onSuccess={handleReload}
            trigger={<Button size="sm" className="rounded-xl h-8 text-xs">Create</Button>}
          />
        </div>
      </div>

      {/* Mobile-First Transaction Filter Bar */}
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

      {/* Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Sort:</span>
          <Button
            variant={sort.startsWith('date') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleSort('date')}
            className="gap-1 h-7 rounded-full text-[11px] px-2.5"
          >
            Date
            {sort === 'date,desc' && <ArrowDown className="h-3 w-3" />}
            {sort === 'date,asc' && <ArrowUp className="h-3 w-3" />}
          </Button>
          <Button
            variant={sort.startsWith('amount') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleSort('amount')}
            className="gap-1 h-7 rounded-full text-[11px] px-2.5"
          >
            Amount
            {sort === 'amount,desc' && <ArrowDown className="h-3 w-3" />}
            {sort === 'amount,asc' && <ArrowUp className="h-3 w-3" />}
          </Button>
          <Button
            variant={isSelectionMode || selectedTxnIds.size > 0 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              if (isSelectionMode && selectedTxnIds.size === 0) {
                setIsSelectionMode(false);
              } else {
                setIsSelectionMode(!isSelectionMode);
              }
            }}
            className="gap-1 h-7 rounded-full text-[11px] px-2.5"
          >
            Select
          </Button>
          {selectedTxnIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTxnIds(new Set());
                setIsSelectionMode(false);
              }}
              className="h-7 text-[11px] text-slate-500 hover:text-slate-900 gap-1 px-2"
            >
              <X className="h-3 w-3" /> Clear selection ({selectedTxnIds.size})
            </Button>
          )}
        </div>

        <div className="flex items-center text-xs text-slate-500">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2 text-slate-400" />}
          {pagedData && (
            <span>
              {pagedData.totalElements.toLocaleString('en-IN')} transaction{pagedData.totalElements === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-2 pb-14">
        {loading && !pagedData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">Loading transactions...</p>
          </div>
        ) : !pagedData || pagedData.content.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
              No transactions found
            </p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              {appliedFilters.length > 0 || search.trim() !== ''
                ? 'Try adjusting your filters or search query to find what you are looking for.'
                : 'Add your first transaction to start tracking!'}
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
                    <div className="text-sm font-medium pl-2 pt-2 sticky top-0 bg-slate-50 dark:bg-slate-900 dark:text-slate-300 z-10">
                      {formatDate(transaction.date)}
                    </div>
                  )}
                  <TransactionCard
                    categories={categories}
                    accounts={accounts}
                    transaction={transaction}
                    onMutate={handleReload}
                    selectable={isSelectionMode || selectedTxnIds.size > 0}
                    selected={selectedTxnIds.has(transaction.id)}
                    onToggleSelect={() => toggleSelect(transaction.id)}
                  />
                </Fragment>
              );
            })}

            {/* Pagination Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                unit="transaction"
              />
            </div>
          </div>
        )}
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
