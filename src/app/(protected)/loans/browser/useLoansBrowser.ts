'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { fetchLoansAction } from '@/actions/loans';
import { Page } from '@/lib/pagination';
import { LoanResponse, LoanStatus } from '@/lib/types';

interface UseLoansBrowserProps {
  initialLoans: Page<LoanResponse>;
}

export function useLoansBrowser({ initialLoans }: UseLoansBrowserProps) {
  const router = useRouter();

  const [loansPage, setLoansPage] = useState<Page<LoanResponse>>(initialLoans);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  const handleFilterChange = async (newStatus: string) => {
    setStatusFilter(newStatus);
    const filter = newStatus === 'all' ? undefined : (newStatus as LoanStatus);
    const res = await fetchLoansAction(filter, 0, loansPage.size);
    if (res.success) {
      setLoansPage(res.data);
    } else {
      toast.error(res.error.message);
    }
  };

  const handlePageChange = async (newPage: number) => {
    const filter =
      statusFilter === 'all' ? undefined : (statusFilter as LoanStatus);
    const res = await fetchLoansAction(filter, newPage, loansPage.size);
    if (res.success) {
      setLoansPage(res.data);
    } else {
      toast.error(res.error.message);
    }
  };

  const handleLoanSuccess = async () => {
    const filter =
      statusFilter === 'all' ? undefined : (statusFilter as LoanStatus);
    const res = await fetchLoansAction(
      filter,
      loansPage.number,
      loansPage.size
    );
    if (res.success) {
      setLoansPage(res.data);
    }
    router.refresh();
  };

  const filteredContent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loansPage.content;
    return loansPage.content.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.lender.toLowerCase().includes(q) ||
        (l.loanAccountNumber &&
          l.loanAccountNumber.toLowerCase().includes(q))
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
    statusFilter,
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    filteredContent,
    totalMonthlyEmi,
    handleFilterChange,
    handlePageChange,
    handleLoanSuccess,
  };
}
