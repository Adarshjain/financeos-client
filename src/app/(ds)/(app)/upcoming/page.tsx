import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { parseUpcomingUrl } from '@/features/upcoming/upcomingUrl';
import { UpcomingView } from '@/features/upcoming/UpcomingView';
import { obligationsApi } from '@/lib/apiClient';
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
  await signInIfPrefetchFailed(qc, keys.obligations.upcoming({ months }));
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <UpcomingView />
    </HydrationBoundary>
  );
}
