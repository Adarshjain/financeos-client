import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { monthsToCover, parseCalendarMonth } from '@/features/upcoming/calendarModel';
import { UpcomingCalendarView } from '@/features/upcoming/UpcomingCalendarView';
import { obligationsApi } from '@/lib/apiClient';
import { todayInAppZone } from '@/lib/date-range';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Upcoming calendar | FinanceOS',
  description: 'Card bills, EMIs, lending returns and expected statements by day.',
};

export default async function DsUpcomingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const today = todayInAppZone();
  const months = monthsToCover(today, parseCalendarMonth((await searchParams).month, today));
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: keys.obligations.upcoming({ months }),
    queryFn: async () => (await obligationsApi.getUpcoming(months)).items,
  });
  await signInIfPrefetchFailed(qc, keys.obligations.upcoming({ months }));
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <UpcomingCalendarView />
    </HydrationBoundary>
  );
}
