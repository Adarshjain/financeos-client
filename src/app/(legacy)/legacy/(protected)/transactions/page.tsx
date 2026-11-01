import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import { accountsApi, tagsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function TransactionsPage() {
  const [accounts, categories] = await Promise.all([accountsApi.list(), tagsApi.list()]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  queryClient.setQueryData(keys.tags.list(), categories);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsBrowser />
    </HydrationBoundary>
  );
}
