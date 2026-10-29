import { redirect } from 'next/navigation';

import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';

import { figuresModel, fnoQuery, fnoSummaryQuery, fnoUrl, type FnoUrlState, monthRows, underlyingRows } from './fnoModel';
import type { FnoScreenProps } from './FnoScreen';
import { fetchFnoPage, fetchFnoSummary } from './fnoServerApi';

/** Everything the F&O screen shows for the address's filters, FY, sort and page. A page past the end redirects to the last one. */
export async function loadFnoScreen(state: FnoUrlState): Promise<Loaded<FnoScreenProps>> {
  const [list, summary, brokers] = await Promise.all([
    loaded(fetchFnoPage(fnoQuery(state))),
    orNull(fetchFnoSummary(fnoSummaryQuery(state))),
    orNull(fetchBrokers()),
  ]);

  if (!list.ok) return list;
  const { content, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(fnoUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }

  return {
    ok: true,
    data: {
      state,
      trades: content,
      totalElements,
      totalPages,
      brokers: (brokers ?? []).map((b) => ({ id: b.id, name: b.name, clientId: b.clientId })),
      summary,
      figures: summary ? figuresModel(summary) : null,
      months: summary && state.fy != null ? monthRows(summary) : [],
      underlyings: summary ? underlyingRows(summary) : [],
    },
  };
}
