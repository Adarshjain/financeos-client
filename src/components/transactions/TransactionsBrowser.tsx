'use client';

import { ArrowDown, ArrowUp, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
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
}

export function TransactionsBrowser({ accounts, categories }: TransactionsBrowserProps) {
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('date,desc');
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

  const fetchTransactions = useCallback(async (currentPage: number, runId: number) => {
    setLoading(true);

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
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
  }, [appliedFilters, debouncedSearch, size, sort]);

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
    <div className="space-y-3">
      <div className="flex justify-between px-4 pt-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <TransactionFormWrapper
          categories={categories}
          accounts={accounts}
          onSuccess={handleReload}
          trigger={<Button>Create</Button>}
        />
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
            className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-950"
          />
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          className="gap-2 rounded-xl"
          onClick={toggleFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {appliedFilters.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {appliedFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="mx-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filters Draft</h3>
            {(draftFilters.length > 0 || appliedFilters.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-rose-500 hover:text-rose-600 h-8"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            )}
          </div>

          {draftFilters.length === 0 ? (
            <p className="text-xs text-slate-500">
              No filters defined.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
              {draftFilters.map((clause, i) => (
                <FilterRow
                  key={i}
                  catalog={TRANSACTIONS_CATALOG}
                  dynamicOptions={dynamicOptions}
                  value={clause}
                  onChange={(c) => updateFilter(i, c)}
                  onRemove={() => removeFilter(i)}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-md"
              onClick={addFilter}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add filter
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="flex-1 h-9 rounded-md bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
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
                unit="transaction"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
