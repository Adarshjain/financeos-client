'use client';

import { useState } from 'react';

import { hasNextInstrumentPage, INSTRUMENT_PAGE_SIZE } from '@/lib/instrumentList';
import { useInstruments } from '@/lib/query/hooks/useInvestments';
import { InstrumentType } from '@/lib/types';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export type InstrumentTypeFilter = 'all' | InstrumentType;

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The instruments page's server-paged catalog: search, type and page/size all go to
 * GET /instruments (sorted by name there), so the page never loads the whole table.
 */
export function useInstrumentsSection() {
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(INSTRUMENT_PAGE_SIZE);
  const [typeFilter, setTypeFilter] = useState<InstrumentTypeFilter>('all');
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const query = useInstruments({
    search: debouncedSearch,
    type: typeFilter === 'all' ? undefined : typeFilter,
    page,
    size: pageSize,
  });
  const instruments = query.data ?? [];

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleTypeFilterChange = (val: string) => {
    setTypeFilter(val as InstrumentTypeFilter);
    setPage(0);
  };

  const handleSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  const filtered = debouncedSearch.trim() !== '' || typeFilter !== 'all';
  // Only an unfiltered first page that came back empty means the catalog itself is empty.
  const catalogEmpty =
    query.isSuccess && !query.isPlaceholderData && !filtered && page === 0 && instruments.length === 0;

  return {
    instruments,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    page,
    setPage,
    pageSize,
    setPageSize: handleSizeChange,
    hasPrev: page > 0,
    hasNext: hasNextInstrumentPage(instruments.length, pageSize),
    typeFilter,
    search,
    handleSearchChange,
    handleTypeFilterChange,
    catalogEmpty,
  };
}
