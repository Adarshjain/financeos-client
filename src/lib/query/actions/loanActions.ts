'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { LoanResponse } from '@/lib/loan.types';

/** The user's active loans (first page), for pickers. */
export const loadActiveLoans = createDomainAction(
  { fallbackError: "Couldn't load loans. Try again." },
  async (query: { status: 'active'; page: number; size: number }): Promise<LoanResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/loans', { params: { query } });
    return (data?.content ?? []) as unknown as LoanResponse[];
  },
);
