'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { searchTransactions } from '@/actions/transactions';
import { FilterClause } from '@/lib/reports.types';
import { PagedTransaction } from '@/lib/transaction.types';

import { TRANSACTIONS_CATALOG } from '../catalog';

export function useTransactionsBrowser(needsReviewCount?: number | null) {
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('date,desc');
  const [localReviewCount, setLocalReviewCount] = useState<number | null>(
    needsReviewCount ?? null
  );

  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false);

  useEffect(() => {
    setLocalReviewCount(needsReviewCount ?? null);
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

  const selectedTransactions = (pagedData?.content || []).filter((t) =>
    selectedTxnIds.has(t.id)
  );

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
          filters: [
            { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
          ],
          search: null,
        },
        0,
        1
      );
      if (runId === runIdRef.current && reviewRes.success) {
        setLocalReviewCount(reviewRes.data.totalElements);
      }
    } catch {
      // Ignore background errors
    }
  }, []);

  const fetchTransactions = useCallback(
    async (currentPage: number, runId: number) => {
      setLoading(true);
      try {
        const cleanFiltersList = appliedFilters.filter((clause) => {
          const fieldDef = TRANSACTIONS_CATALOG.fields.find(
            (f) => f.name === clause.field
          );
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
          sort
        );

        if (runId !== runIdRef.current) return;

        if (res.success) {
          setPagedData(res.data);
          if (
            res.data.content.length === 0 &&
            res.data.totalElements > 0 &&
            currentPage > 0
          ) {
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
    },
    [appliedFilters, debouncedSearch, size, sort]
  );

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

  return {
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
  };
}
