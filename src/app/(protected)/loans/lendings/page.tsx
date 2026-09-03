import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { LendingsBrowser } from '@/app/(protected)/loans/lendings/LendingsBrowser';
import { counterpartiesApi, loansApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Lendings Ledger | FinanceOS',
  description: 'Track person-to-person money lent and borrowed.',
};

export default async function LendingsPage() {
  const qc = getQueryClient();

  await Promise.all([
    qc.prefetchQuery({
      queryKey: keys.lendings.counterparties({ page: 0, size: 50 }),
      queryFn: () => counterpartiesApi.list(0, 50),
    }),
    qc.prefetchQuery({
      queryKey: keys.loans.summary(),
      queryFn: () => loansApi.getSummary(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <LendingsBrowser />
    </HydrationBoundary>
  );
}
