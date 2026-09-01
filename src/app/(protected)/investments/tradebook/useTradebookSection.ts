'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { listInvestmentTransactions } from '@/actions/investments';
import {
  InvestmentTransactionResponse,
  PagedInvestmentTransactionResponse,
} from '@/lib/types';

interface UseTradebookSectionProps {
  initialData: PagedInvestmentTransactionResponse;
}

export function useTradebookSection({
  initialData,
}: UseTradebookSectionProps) {
  const [selectedBrokerFilter, setSelectedBrokerFilter] =
    useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(initialData.number || 0);
  const [pageSize, setPageSize] = useState<number>(initialData.size || 12);

  const [transactions, setTransactions] = useState<
    InvestmentTransactionResponse[]
  >(initialData.content || []);
  const [totalElements, setTotalElements] = useState<number>(
    initialData.totalElements || 0
  );
  const [totalPages, setTotalPages] = useState<number>(
    initialData.totalPages || 1
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listInvestmentTransactions(page, pageSize, {
        ...(selectedBrokerFilter === 'all'
          ? {}
          : { brokerAccountId: selectedBrokerFilter }),
        ...(search ? { search } : {}),
      });
      if (res.success) {
        setTransactions(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedBrokerFilter, search]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchPage();
  }, [fetchPage, initialData]);

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
    isLoading,
    currentPage,
    fetchPage,
    handleBrokerFilterChange,
  };
}
