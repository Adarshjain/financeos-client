import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { UpcomingCalendarScreen } from '@/features/upcoming/UpcomingCalendarScreen';
import { parseUpcomingCalendarUrl } from '@/features/upcoming/upcomingUrl';
import { obligationsApi } from '@/lib/apiClient';
import { todayInAppZone } from '@/lib/date-range';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Upcoming',
  description: 'Card bills, EMIs, lending returns and expected statements by day.',
};

export default async function DsUpcomingCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { months } = parseUpcomingCalendarUrl(await searchParams, todayInAppZone());
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: keys.obligations.upcoming({ months }),
    queryFn: async () => (await obligationsApi.getUpcoming(months)).items,
  });
  await signInIfPrefetchFailed(qc, keys.obligations.upcoming({ months }));
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <UpcomingCalendarScreen />
    </HydrationBoundary>
  );
}
