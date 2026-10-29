import { notFound } from 'next/navigation';
import { cache } from 'react';

import { signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import { loansApi } from '@/lib/apiClient';
import type { InstallmentDto, LoanDetailResponse } from '@/lib/loan.types';

export interface LoanPageData {
  detail: LoanDetailResponse;
  schedule: InstallmentDto[];
}

/**
 * The loan and its schedule, one request pass per render. A loan that does not exist is a 404; any other
 * failure throws to the route's error state. The schedule is secondary: when it fails the page still shows the loan.
 */
export const loadLoanPage = cache(async (id: string): Promise<LoanPageData> => {
  const [detail, schedule] = await Promise.all([
    loansApi.getDetail(id).catch(async (e: unknown) => {
      await signInIfSessionEnded(e);
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }),
    loansApi.getSchedule(id).catch((): InstallmentDto[] => []),
  ]);
  if (!detail) notFound();
  return { detail, schedule };
});
