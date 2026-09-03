import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import { accountsApi, categoriesApi, transactionsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function TransactionsPage() {
  const [accounts, categories, reviewPagedData] = await Promise.all([
    accountsApi.list(),
    categoriesApi.list(),
    transactionsApi
      .search(
        { filters: [{ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' }] },
        { page: 0, size: 1 }
      )
      .catch(() => null),
  ]);

  const needsReviewCount = reviewPagedData?.totalElements ?? null;

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  queryClient.setQueryData(keys.categories.list(), categories);
  queryClient.setQueryData(keys.transactions.reviewCount(), needsReviewCount);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsBrowser needsReviewCount={needsReviewCount} />
    </HydrationBoundary>
  );
}
