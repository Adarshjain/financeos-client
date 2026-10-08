import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { obligationsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

import { UpcomingView } from './UpcomingView';

export const metadata = {
  title: 'Upcoming | FinanceOS',
  description: 'Card bills, EMIs, lending returns and expected statements by date.',
};

export default async function UpcomingPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: keys.obligations.upcoming({ months: 3 }),
    queryFn: async () => (await obligationsApi.getUpcoming(3)).items,
  });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <UpcomingView />
    </HydrationBoundary>
  );
}
