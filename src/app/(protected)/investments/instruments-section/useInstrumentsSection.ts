'use client';

import { useState } from 'react';

import { INSTRUMENT_PAGE_SIZE, type InstrumentSortDir } from '@/lib/instrumentList';
import { useInstruments } from '@/lib/query/hooks/useInvestments';
import { InstrumentType } from '@/lib/types';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export type InstrumentTypeFilter = 'all' | InstrumentType;

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The instruments page's server-paged catalog: search, type, name order and page/size all go to
 * GET /instruments, which answers one page plus the total, so the page never loads the whole table.
 */
export function useInstrumentsSection() {
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(INSTRUMENT_PAGE_SIZE);
  const [typeFilter, setTypeFilter] = useState<InstrumentTypeFilter>('all');
  const [sortDir, setSortDir] = useState<InstrumentSortDir>('asc');
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const query = useInstruments({
    search: debouncedSearch,
    type: typeFilter === 'all' ? undefined : typeFilter,
    sortDir,
    page,
    size: pageSize,
  });
  const instruments = query.data?.items ?? [];
  const totalElements = query.data?.totalElements;
  const totalPages = query.data?.totalPages ?? 0;

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

  const toggleSort = () => {
    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(0);
  };

  const filtered = debouncedSearch.trim() !== '' || typeFilter !== 'all';
  // Only an unfiltered first page that came back empty means the catalog itself is empty.
  const catalogEmpty =
    query.isSuccess && !query.isPlaceholderData && !filtered && page === 0 && instruments.length === 0;

  return {
    instruments,
    /** Instruments matching the search and type over all pages; undefined until the first answer. */
    totalElements,
    totalPages,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    page,
    setPage,
    pageSize,
    setPageSize: handleSizeChange,
    sortDir,
    toggleSort,
    typeFilter,
    search,
    handleSearchChange,
    handleTypeFilterChange,
    catalogEmpty,
  };
}
