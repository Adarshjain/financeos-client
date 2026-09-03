import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { LoansBrowser } from '@/app/(protected)/loans/LoansBrowser';
import { accountsApi, loansApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Loans | FinanceOS',
  description:
    'Manage formal loans, schedules, prepayments, and effective APR.',
};

export default async function LoansPage() {
  const qc = getQueryClient();

  await Promise.all([
    qc.prefetchQuery({
      queryKey: keys.loans.list({ status: undefined, page: 0, size: 50 }),
      queryFn: () => loansApi.list(undefined, 0, 50),
    }),
    qc.prefetchQuery({
      queryKey: keys.loans.summary(),
      queryFn: () => loansApi.getSummary(),
    }),
    qc.prefetchQuery({
      queryKey: keys.accounts.list(),
      queryFn: () => accountsApi.list(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <LoansBrowser />
    </HydrationBoundary>
  );
}
