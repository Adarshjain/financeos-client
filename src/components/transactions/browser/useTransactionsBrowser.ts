'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { FilterClause } from '@/lib/reports.types';
import type { PagedTransaction } from '@/lib/transaction.types';

import { TRANSACTIONS_CATALOG } from '../catalog';

export function useTransactionsBrowser(needsReviewCount?: number | null) {
  const queryClient = useQueryClient();
  const [appliedFilters, setAppliedFilters] = useState<FilterClause[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('date,desc');

  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

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

  const searchParams = {
    filters: cleanFiltersList,
    search: debouncedSearch.trim() || undefined,
    page,
    size,
    sort,
  };

  const { data: pagedData = null, isLoading: loading } = useQuery({
    queryKey: keys.transactions.search(searchParams),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: {
          filters: searchParams.filters,
          search: searchParams.search,
        },
        params: {
          query: {
            page: searchParams.page,
            size: searchParams.size,
            sort: [searchParams.sort],
          },
        },
      });
      return data ?? null;
    },
    placeholderData: keepPreviousData,
  });

  const { data: reviewCountData } = useQuery({
    queryKey: keys.transactions.reviewCount(),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: {
          filters: [{ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' }],
        },
        params: {
          query: { page: 0, size: 1 },
        },
      });
      return data?.totalElements ?? null;
    },
    initialData: needsReviewCount ?? undefined,
  });

  const localReviewCount = reviewCountData ?? needsReviewCount ?? null;

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

  const handleReload = () => {
    queryClient.invalidateQueries({ queryKey: keys.transactions.all });
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
