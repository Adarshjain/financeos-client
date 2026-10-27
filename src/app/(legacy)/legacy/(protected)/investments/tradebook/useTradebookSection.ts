'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { PagedInvestmentTransactionResponse } from '@/lib/types';

interface UseTradebookSectionProps {
  initialData: PagedInvestmentTransactionResponse;
}

export function useTradebookSection({ initialData }: UseTradebookSectionProps) {
  const [selectedBrokerFilter, setSelectedBrokerFilter] =
    useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(initialData.number || 0);
  const [pageSize, setPageSize] = useState<number>(initialData.size || 12);

  // Debounce free-text search input before it drives the query. Only a *changed* search
  // resets the page: the mount run (and re-typing the same text) must not undo a page the
  // user has already navigated to.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = setTimeout(() => {
      setSearch(next);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const isDefaultFilters =
    page === (initialData.number || 0) &&
    pageSize === (initialData.size || 12) &&
    selectedBrokerFilter === 'all' &&
    !search;

  const queryParams = {
    page,
    size: pageSize,
    ...(selectedBrokerFilter === 'all'
      ? {}
      : { brokerAccountId: selectedBrokerFilter }),
    ...(search ? { search } : {}),
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: keys.investments.transactions(queryParams),
    queryFn: async () =>
      (
        await api.GET('/api/v1/investments/transactions', {
          params: { query: queryParams },
        })
      ).data! as PagedInvestmentTransactionResponse,
    // The server page prefetches the same (page:0/size:initial/no filters) key, so
    // reuse that seeded data instead of a redundant client fetch on first paint.
    initialData: isDefaultFilters ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const pageData = data ?? initialData;
  const transactions = pageData.content || [];
  const totalElements = pageData.totalElements || 0;
  const totalPages = pageData.totalPages || 1;
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const handleBrokerFilterChange = (val: string) => {
    setSelectedBrokerFilter(val);
    setPage(0);
  };

  return {
    selectedBrokerFilter,
    setSelectedBrokerFilter,
    searchInput,
    setSearchInput,
    search,
    page,
    setPage,
    pageSize,
    setPageSize,
    transactions,
    totalElements,
    totalPages,
    isLoading: isFetching,
    currentPage,
    fetchPage: refetch,
    handleBrokerFilterChange,
  };
}
