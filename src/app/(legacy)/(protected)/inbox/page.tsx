import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { InboxView } from '@/components/inbox/InboxView';
import { inboxApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const item = params?.item;
  const highlightKey = (Array.isArray(item) ? item[0] : item) || null;

  // A failed prefetch is not fatal: the view loads (and reports errors) on the client.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({ queryKey: keys.inbox.list(), queryFn: () => inboxApi.list() });
  const inbox = queryClient.getQueryData<Awaited<ReturnType<typeof inboxApi.list>>>(keys.inbox.list());
  if (inbox) {
    queryClient.setQueryData(keys.inbox.summary(), inbox.summary);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InboxView highlightKey={highlightKey} />
    </HydrationBoundary>
  );
}
