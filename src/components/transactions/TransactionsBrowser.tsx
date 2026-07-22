'use client';

import { ArrowDown, ArrowUp, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { searchTransactions } from '@/actions/transactions';
import type { DynamicOptions } from '@/components/reports/catalog';
import { defaultFilterClause, FilterRow } from '@/components/reports/FilterRow';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

import { TRANSACTIONS_CATALOG } from './catalog';
import { TransactionCard } from './TransactionCard';
import { TransactionFormWrapper } from './TransactionFormWrapper';

interface TransactionsBrowserProps {
  accounts: Account[];
  categories: Category[];
  needsReviewCount?: number;
}

export function TransactionsBrowser({ accounts, categories, needsReviewCount }: TransactionsBrowserProps) {
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('date,desc');
  const [localReviewCount, setLocalReviewCount] = useState(needsReviewCount ?? 0);

  useEffect(() => {
    setLocalReviewCount(needsReviewCount ?? 0);
  }, [needsReviewCount]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [pagedData, setPagedData] = useState<PagedTransaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const runIdRef = useRef(0);

  const toggleFilters = () => {
    if (!showFilters) {
      setDraftFilters(appliedFilters);
    }
    setShowFilters(!showFilters);
  };

  const dynamicOptions: DynamicOptions = {
    category: categories.map((c) => ({ id: c.name, name: c.name })),
    accountId: accounts.map((a) => ({ id: a.id, name: a.name })),
  };

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
      // Ignore background refresh errors
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

  const addFilter = () => {
    const field = TRANSACTIONS_CATALOG.fields.find((f) => f.name === 'amount');
    if (!field) return;
    const operator = TRANSACTIONS_CATALOG.operators.number[0] ?? 'equals';
    setDraftFilters((prev) => [...prev, defaultFilterClause(TRANSACTIONS_CATALOG, field, operator)]);
  };

  const updateFilter = (index: number, clause: FilterClause) => {
    setDraftFilters((prev) => {
      const next = [...prev];
      next[index] = clause;
      return next;
    });
  };

  const removeFilter = (index: number) => {
    setDraftFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(0);
  };

  const handleClearAll = () => {
    setDraftFilters([]);
    setAppliedFilters([]);
    setPage(0);
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-4 pt-4 pb-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <div className="flex items-center gap-2">
          <Link href="/transactions/review">
            <Button variant="outline" className="relative gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all">
              <span>Review</span>
              {localReviewCount !== undefined && localReviewCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded-md bg-amber-500 text-[10px] font-bold text-white">
                  {localReviewCount}
                </span>
              )}
            </Button>
          </Link>
          <TransactionFormWrapper
            categories={categories}
            accounts={accounts}
            onSuccess={handleReload}
            trigger={<Button className="rounded-xl">Create</Button>}
          />
        </div>
      </div>

      {/* Search and Filters Toggle */}
      <div className="flex flex-wrap items-center gap-2 px-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search descriptions, accounts, categories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-all"
          />
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          className={`gap-2 rounded-xl transition-all ${
            showFilters
              ? 'bg-slate-100 dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
              : 'hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
          onClick={toggleFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {appliedFilters.length > 0 && (
            <span className="flex h-4.5 w-4.5 min-w-[1.125rem] px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white transition-all scale-100">
              {appliedFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="mx-4 p-4 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-sm shadow-slate-100/10 dark:shadow-none transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filters Draft</h3>
            </div>
            {(draftFilters.length > 0 || appliedFilters.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 h-8 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5 rounded-lg"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            )}
          </div>

          {draftFilters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-950/20">
              <SlidersHorizontal className="h-6 w-6 text-slate-400 dark:text-slate-500 mb-1.5" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No filter rules configured</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 text-center">Click &quot;Add filter&quot; to define rules and search transactions.</p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-3">
              {draftFilters.map((clause, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <div className="relative flex justify-center items-center my-1">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-200 dark:border-slate-850" />
                      </div>
                      <span className="relative z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-slate-700/40 tracking-wider uppercase">
                        and
                      </span>
                    </div>
                  )}
                  <FilterRow
                    catalog={TRANSACTIONS_CATALOG}
                    dynamicOptions={dynamicOptions}
                    value={clause}
                    onChange={(c) => updateFilter(i, c)}
                    onRemove={() => removeFilter(i)}
                  />
                </Fragment>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9.5 rounded-xl border-dashed bg-white dark:bg-slate-950 font-medium gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 shadow-none transition-colors"
              onClick={addFilter}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add filter
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="flex-1 h-9.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/20 shadow-sm transition-colors"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Sort:</span>
          <Button
            variant={sort.startsWith('date') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleSort('date')}
            className="gap-1 h-8 rounded-full text-xs"
          >
            Date
            {sort === 'date,desc' && <ArrowDown className="h-3.5 w-3.5" />}
            {sort === 'date,asc' && <ArrowUp className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant={sort.startsWith('amount') ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleSort('amount')}
            className="gap-1 h-8 rounded-full text-xs"
          >
            Amount
            {sort === 'amount,desc' && <ArrowDown className="h-3.5 w-3.5" />}
            {sort === 'amount,asc' && <ArrowUp className="h-3.5 w-3.5" />}
          </Button>
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
                    <div className="text-lg font-medium pl-2 pb-1 pt-2 sticky top-0 bg-slate-50 dark:bg-slate-900 dark:text-slate-300 z-10">
                      {formatDate(transaction.date)}
                    </div>
                  )}
                  <TransactionCard
                    categories={categories}
                    accounts={accounts}
                    transaction={transaction}
                    onMutate={handleReload}
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
    </div>
  );
}
