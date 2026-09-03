import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { accountsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

import { IngestForm } from './IngestForm';

export default async function IngestPage() {
  const accounts = await accountsApi.list();

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IngestForm initialAccounts={accounts} />
    </HydrationBoundary>
  );
}
