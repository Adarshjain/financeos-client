'use client';

import { useMemo, useState } from 'react';

import { Instrument } from '@/lib/types';

import { SortOrder } from './InstrumentsFilterBar';

interface UseInstrumentsSectionProps {
  instruments: Instrument[];
}

export function useInstrumentsSection({
  instruments,
}: UseInstrumentsSectionProps) {
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(24);
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleTypeFilterChange = (val: string) => {
    setTypeFilter(val);
    setPage(0);
  };

  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
    setPage(0);
  };

  const filteredInstruments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return instruments.filter((inst) => {
      const matchesSearch =
        !query ||
        !!inst.name?.toLowerCase().includes(query) ||
        !!inst.symbol?.toLowerCase().includes(query) ||
        !!inst.yahooSymbol?.toLowerCase().includes(query) ||
        !!inst.amfiCode?.toLowerCase().includes(query) ||
        !!inst.isin?.toLowerCase().includes(query);

      const matchesType = typeFilter === 'all' || inst.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [instruments, search, typeFilter]);

  const sortedInstruments = useMemo(() => {
    if (sortOrder === 'none') return filteredInstruments;

    return [...filteredInstruments].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredInstruments, sortOrder]);

  const totalElements = sortedInstruments.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedInstruments = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedInstruments.slice(start, start + pageSize);
  }, [sortedInstruments, currentPage, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    sortOrder,
    typeFilter,
    search,
    handleSearchChange,
    handleTypeFilterChange,
    toggleSort,
    totalElements,
    totalPages,
    currentPage,
    sortedInstruments,
    pagedInstruments,
  };
}
