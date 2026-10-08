import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { AccountDetailView } from '@/components/account-detail/AccountDetailView';
import { accountsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await accountsApi.get(id).catch(() => null);
  if (!account) notFound();

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.byId(id), account);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountDetailView account={account} />
    </HydrationBoundary>
  );
}
