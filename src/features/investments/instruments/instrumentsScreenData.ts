import { redirect } from 'next/navigation';

import { type Loaded, loaded } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';

import { instrumentsQuery, instrumentsUrl, type InstrumentsUrlState } from './instrumentsModel';
import type { InstrumentsScreenProps } from './InstrumentsScreen';
import { fetchInstrumentsPage } from './instrumentsServerApi';

/** Everything the Instruments screen shows for the address's search, type, stale, order and page. A page past the end redirects to the last one. */
export async function loadInstrumentsScreen(state: InstrumentsUrlState): Promise<Loaded<InstrumentsScreenProps>> {
  const list = await loaded(fetchInstrumentsPage(instrumentsQuery(state)));
  if (!list.ok) return list;
  const { items, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(instrumentsUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }
  const filtered = state.q !== '' || state.type !== '' || state.stale;
  return {
    ok: true,
    data: { state, items, totalElements, totalPages, catalogEmpty: !filtered && state.page === 0 && items.length === 0 },
  };
}
