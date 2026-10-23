import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { parseMonths } from '@/features/upcoming/upcomingModel';
import { UpcomingView } from '@/features/upcoming/UpcomingView';
import { obligationsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Upcoming | FinanceOS',
  description: 'Card bills, EMIs, lending returns and expected statements by date.',
};

export default async function DsUpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const months = parseMonths((await searchParams).months);
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
