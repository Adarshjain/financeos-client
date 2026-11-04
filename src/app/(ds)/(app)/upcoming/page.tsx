import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { UpcomingScreen } from '@/features/upcoming/UpcomingScreen';
import { parseUpcomingUrl } from '@/features/upcoming/upcomingUrl';
import { unwrapAction } from '@/lib/actionResult';
import { obligationsApi } from '@/lib/apiClient';
import { loadRecurringProposals } from '@/lib/query/actions/recurringActions';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Upcoming',
  description: 'Card bills, EMIs, lending returns and expected statements by date.',
};

export default async function DsUpcomingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { months } = parseUpcomingUrl(await searchParams);
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: keys.obligations.upcoming({ months }),
    queryFn: async () => (await obligationsApi.getUpcoming(months)).items,
  });
  // Proposals are optional: a failed prefetch leaves the card out and the client retries.
  await qc.prefetchQuery({
    queryKey: keys.recurring.proposals(),
    queryFn: () => unwrapAction(loadRecurringProposals()),
  });
  await signInIfPrefetchFailed(qc, keys.obligations.upcoming({ months }));
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <UpcomingScreen />
    </HydrationBoundary>
  );
}
