'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { FilterClause } from '@/lib/reports.types';

export interface UseTransactionWorkspaceOptions {
  initialPageSize?: number;
  initialSort?: string;
  defaultFilters?: FilterClause[];
}

export function useTransactionWorkspace(options: UseTransactionWorkspaceOptions = {}) {
  const { initialPageSize = 50, initialSort = 'date,desc', defaultFilters = [] } = options;
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(initialSort);
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>(defaultFilters);

  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const filterClauses: FilterClause[] = useMemo(() => {
    const clauses = [...appliedFilters];
    if (search.trim()) {
      clauses.push({
        field: 'description',
        operator: 'CONTAINS',
        value: search.trim(),
      });
    }
    return clauses;
  }, [appliedFilters, search]);

  const searchParams = { filters: filterClauses, page, size: pageSize, sort };

  const { data: pagedData = null, isLoading: loading } = useQuery({
    queryKey: keys.transactions.search(searchParams),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: { filters: searchParams.filters },
        params: {
          query: { page: searchParams.page, size: searchParams.size, sort: [searchParams.sort] },
        },
      });
      return data ?? null;
    },
    placeholderData: keepPreviousData,
  });

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.transactions.all });
  }, [queryClient]);

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
