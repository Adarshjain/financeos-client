import { notFound } from 'next/navigation';
import { cache } from 'react';

import type { Account } from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { accountsApi, loansApi } from '@/lib/apiClient';
import type { InstallmentDto, LoanDetailResponse } from '@/lib/loan.types';

export interface LoanPageData {
  detail: LoanDetailResponse;
  schedule: InstallmentDto[];
  /** The bank account the EMIs are paid from, when the loan has one and it still exists. */
  paymentAccountName: string | null;
}

/**
 * The loan, its schedule and its payment account's name, one request pass per render. A loan that does not
 * exist is a 404; any other failure throws to the route's error state. The schedule and accounts are
 * secondary: when they fail the page still shows the loan.
 */
export const loadLoanPage = cache(async (id: string): Promise<LoanPageData> => {
  const [detail, schedule, accounts] = await Promise.all([
    loansApi.getDetail(id).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    loansApi.getSchedule(id).catch((): InstallmentDto[] => []),
    accountsApi.list().catch((): Account[] => []),
  ]);
  if (!detail) notFound();
  const paymentAccountId = detail.loan.paymentAccountId;
  return {
    detail,
    schedule,
    paymentAccountName: paymentAccountId ? (accounts.find((a) => a.id === paymentAccountId)?.name ?? null) : null,
  };
});
