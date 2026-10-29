'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadActiveLoans } from '@/lib/query/actions/loans';
import { keys } from '@/lib/query/keys';

/** The first page of active loans: what a loan picker offers (same page as the payment-link dialog's). */
export const ACTIVE_LOANS_PAGE = { status: 'active', page: 0, size: 100 } as const;

/** GET /loans?status=active — the user's active loans, for pickers. */
export function useActiveLoans({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.loans.list(ACTIVE_LOANS_PAGE),
    queryFn: () => unwrapAction(loadActiveLoans({ ...ACTIVE_LOANS_PAGE })),
    enabled,
  });
}
