import { redirect } from 'next/navigation';

import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import { todayInAppZone } from '@/lib/date-range';

import { jobLine, tradebookQuery, tradebookRow, tradebookUrl, type TradebookUrlState } from './tradebookModel';
import type { TradebookScreenProps } from './TradebookScreen';
import { fetchLastImportJob, fetchLastReconcileJob, fetchTradebookPage } from './tradebookServerApi';

/** What the Tradebook view shows for the address's search, filters and page. A page past the end redirects to the last one. */
export async function loadTradebookScreen(state: TradebookUrlState): Promise<Loaded<TradebookScreenProps>> {
  const [list, brokers, lastImport, lastReconcile] = await Promise.all([
    loaded(fetchTradebookPage(tradebookQuery(state))),
    orNull(fetchBrokers()),
    orNull(fetchLastImportJob()),
    orNull(fetchLastReconcileJob()),
  ]);

  if (!list.ok) return list;
  const { content, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(tradebookUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }

  return {
    ok: true,
    data: {
      state,
      rows: content.map(tradebookRow),
      totalElements,
      totalPages,
      brokers: (brokers ?? []).map((b) => ({ id: b.id, name: b.name })),
      today: todayInAppZone(),
      jobLines: [jobLine('Last import', lastImport, true), jobLine('Last reconcile', lastReconcile, false)],
    },
  };
}
