import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { instrumentsApi } from '@/lib/apiClient';
import { instrumentListQuery } from '@/lib/instrumentList';
import { getQueryClient, keys } from '@/lib/query';
import { Instrument } from '@/lib/types';

import { InstrumentsView } from './InstrumentsView';

export default async function InstrumentsPage() {
  const qc = getQueryClient();
  // Only the first server page (what useInstrumentsSection asks for on load), never the whole catalog.
  const firstPage = instrumentListQuery();
  const instruments = await instrumentsApi.list(firstPage).catch(() => null as Instrument[] | null);
  if (instruments) qc.setQueryData(keys.investments.instruments({ ...firstPage }), instruments);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        <InstrumentsView />
      </div>
    </HydrationBoundary>
  );
}
