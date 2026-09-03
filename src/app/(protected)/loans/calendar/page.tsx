import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { CalendarView } from '@/app/(protected)/loans/calendar/CalendarView';
import { obligationsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export const metadata = {
  title: 'Obligations Calendar | FinanceOS',
  description: 'Upcoming loan EMIs and P2P lending expected returns calendar.',
};

const DEFAULT_MONTHS = 3;

export default async function ObligationsCalendarPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: keys.lendings.obligations(DEFAULT_MONTHS),
    queryFn: () => obligationsApi.getUpcoming(DEFAULT_MONTHS),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CalendarView />
    </HydrationBoundary>
  );
}
