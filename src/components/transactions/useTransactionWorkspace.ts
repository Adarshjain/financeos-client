'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { searchTransactions } from '@/actions/transactions';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction } from '@/lib/transaction.types';

export interface UseTransactionWorkspaceOptions {
  initialPageSize?: number;
  initialSort?: string;
  defaultFilters?: FilterClause[];
}

export function useTransactionWorkspace(options: UseTransactionWorkspaceOptions = {}) {
  const { initialPageSize = 50, initialSort = 'date,desc', defaultFilters = [] } = options;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(initialSort);
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>(defaultFilters);

  const [reloadVersion, setReloadVersion] = useState(0);

  // Identifies the query the current fetch is for; `loading` is derived by
  // comparing it to the query the latest stored result belongs to.
  const queryKey = useMemo(
    () => JSON.stringify({ appliedFilters, search, page, pageSize, sort, reloadVersion }),
    [appliedFilters, search, page, pageSize, sort, reloadVersion],
  );

  const [result, setResult] = useState<{ key: string; data: PagedTransaction | null } | null>(null);
  const pagedData = result?.data ?? null;
  const loading = result?.key !== queryKey;

  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const filterClauses: FilterClause[] = [...appliedFilters];
      if (search.trim()) {
        filterClauses.push({
          field: 'description',
          operator: 'CONTAINS',
          value: search.trim(),
        });
      }

      const res = await searchTransactions(
        { filters: filterClauses },
        page,
        pageSize,
        sort,
      );

      if (cancelled) return;
      setResult((prev) => ({
        key: queryKey,
        data: res.success ? res.data : (prev?.data ?? null),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [queryKey, appliedFilters, search, page, pageSize, sort]);

  const reload = useCallback(() => {
    setReloadVersion((v) => v + 1);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!pagedData) return;
    const allIds = pagedData.content.map((t) => t.id);
    setSelectedTxnIds(new Set(allIds));
  }, [pagedData]);

  const clearSelection = useCallback(() => {
    setSelectedTxnIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const selectedTransactions = useMemo(() => {
    if (!pagedData) return [];
    return pagedData.content.filter((t) => selectedTxnIds.has(t.id));
  }, [pagedData, selectedTxnIds]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    sort,
    setSort,
    search,
    setSearch,
    appliedFilters,
    setAppliedFilters,
    pagedData,
    loading,
    reload,
    selectedTxnIds,
    selectedTransactions,
    isSelectionMode,
    setIsSelectionMode,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
