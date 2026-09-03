'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { api } from '@/lib/api/client';
import type { Page } from '@/lib/pagination';
import { keys } from '@/lib/query/keys';
import { LoanResponse, LoansSummaryResponse, LoanStatus } from '@/lib/types';

const PAGE_SIZE = 50;

const EMPTY_LOANS_PAGE: Page<LoanResponse> = {
  content: [],
  number: 0,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
};

const EMPTY_SUMMARY: LoansSummaryResponse = {
  totalOutstanding: 0,
  activeLoanCount: 0,
  lentOutstanding: 0,
  borrowedOutstanding: 0,
  netReceivable: 0,
};

export function useLoansBrowser() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const status =
    statusFilter === 'all' ? undefined : (statusFilter as LoanStatus);

  const { data, isLoading, error } = useQuery({
    queryKey: keys.loans.list({ status, page, size: PAGE_SIZE }),
    queryFn: async () =>
      (
        await api.GET('/api/v1/loans', {
          params: { query: { status, page, size: PAGE_SIZE } },
        })
      ).data! as Page<LoanResponse>,
    placeholderData: keepPreviousData,
  });

  const { data: summaryData } = useQuery({
    queryKey: keys.loans.summary(),
    queryFn: async () =>
      (await api.GET('/api/v1/loans/summary')).data! as LoansSummaryResponse,
  });

  const loansPage = data ?? EMPTY_LOANS_PAGE;
  const summary = summaryData ?? EMPTY_SUMMARY;

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);

  const filteredContent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loansPage.content;
    return loansPage.content.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.lender && l.lender.toLowerCase().includes(q)) ||
        (l.loanAccountNumber && l.loanAccountNumber.toLowerCase().includes(q))
    );
  }, [loansPage.content, search]);

  const totalMonthlyEmi = useMemo(() => {
    return loansPage.content.reduce(
      (acc, l) => acc + (l.status === 'active' ? l.currentEmi : 0),
      0
    );
  }, [loansPage.content]);

  return {
    loansPage,
    summary,
    isLoading,
    error,
    statusFilter,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    filteredContent,
    totalMonthlyEmi,
    handleFilterChange,
    handlePageChange,
  };
}
