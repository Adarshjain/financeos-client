import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { instrumentsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import { Instrument } from '@/lib/types';

import { InstrumentsView } from './InstrumentsView';

export default async function InstrumentsPage() {
  const qc = getQueryClient();
  const instrumentsData = await instrumentsApi.search().catch(() => [] as Instrument[]);
  const instruments: Instrument[] = instrumentsData || [];
  qc.setQueryData(keys.investments.instruments(), instruments);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        <InstrumentsView />
      </div>
    </HydrationBoundary>
  );
}
