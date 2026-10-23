import { redirect } from 'next/navigation';
import React from 'react';

import { InstrumentsListCard } from '@/features/investments/instruments/InstrumentsListCard';
import { instrumentsQuery, instrumentsUrl, parseInstrumentsUrl } from '@/features/investments/instruments/instrumentsModel';
import { InstrumentsPricesLine } from '@/features/investments/instruments/InstrumentsPricesLine';
import { fetchInstrumentsPage, fetchInstrumentTypeCounts } from '@/features/investments/instruments/instrumentsServerApi';
import { fetchLatestPriceJobId } from '@/features/investments/investmentsServerApi';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { loaded, orNull } from '@/features/shell/loadHelpers';

type SearchParams = { q?: string; type?: string; stale?: string; sort?: string; page?: string; size?: string };

/** /ds/investments/instruments: the catalog. Search, type, stale, name order and page are in the URL and answered by the server. */
export default async function DsInstrumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseInstrumentsUrl(await searchParams);
  const [list, counts, latestJobId] = await Promise.all([
    loaded(fetchInstrumentsPage(instrumentsQuery(state))),
    orNull(fetchInstrumentTypeCounts(state)),
    orNull(fetchLatestPriceJobId()),
  ]);

  if (!list.ok) return <LoansLoadError what="instruments" reference={list.reference} />;
  const { items, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(instrumentsUrl({ ...state, page: totalPages - 1 }));
  }
  const filtered = state.q !== '' || state.type !== '' || state.stale;

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <InstrumentsPricesLine latestJobId={latestJobId} />
      <InstrumentsListCard
        state={state}
        items={items}
        totalElements={totalElements}
        totalPages={totalPages}
        counts={counts ?? {}}
        catalogEmpty={!filtered && state.page === 0 && items.length === 0}
      />
    </div>
  );
}
