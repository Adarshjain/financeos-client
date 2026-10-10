'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { LoanResponse } from '@/lib/loan.types';
import { keys } from '@/lib/query/keys';

/** The first page of active loans: what a loan picker offers (same page as the payment-link dialog's). */
export const ACTIVE_LOANS_PAGE = { status: 'active', page: 0, size: 100 } as const;

/** GET /loans?status=active — the user's active loans, for pickers. */
export function useActiveLoans({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.loans.list(ACTIVE_LOANS_PAGE),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/loans', { params: { query: ACTIVE_LOANS_PAGE } });
      return (data?.content ?? []) as LoanResponse[];
    },
    enabled,
  });
}
