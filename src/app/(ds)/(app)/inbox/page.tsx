import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { InboxScreen } from '@/features/inbox/InboxScreen';
import { parseInboxUrl } from '@/features/inbox/inboxUrl';
import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { inboxApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Inbox' };

export default async function DsInboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { highlightKey } = parseInboxUrl(await searchParams);

  // A failed prefetch is not fatal: the page loads (and reports errors) on the client.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({ queryKey: keys.inbox.list(), queryFn: () => inboxApi.list() });
  await signInIfPrefetchFailed(queryClient, keys.inbox.list());
  const inbox = queryClient.getQueryData<Awaited<ReturnType<typeof inboxApi.list>>>(keys.inbox.list());
  if (inbox) {
    queryClient.setQueryData(keys.inbox.summary(), inbox.summary);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InboxScreen highlightKey={highlightKey} />
    </HydrationBoundary>
  );
}
