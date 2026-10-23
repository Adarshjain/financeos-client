import { redirect } from 'next/navigation';
import React from 'react';

import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import {
  jobLine,
  parseTradebookUrl,
  tradebookQuery,
  tradebookRow,
  tradebookUrl,
} from '@/features/investments/tradebook/tradebookModel';
import { fetchLastImportJob, fetchLastReconcileJob, fetchTradebookPage } from '@/features/investments/tradebook/tradebookServerApi';
import { TradebookView } from '@/features/investments/tradebook/TradebookView';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';

type SearchParams = { q?: string; broker?: string; type?: string; fy?: string; page?: string; size?: string };

/** /ds/investments/tradebook: the paged tradebook. The search, filters and page are in the URL and answered by the server. */
export default async function DsTradebookPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseTradebookUrl(await searchParams);
  const [list, brokers, lastImport, lastReconcile] = await Promise.all([
    loaded(fetchTradebookPage(tradebookQuery(state))),
    orNull(fetchBrokers()),
    orNull(fetchLastImportJob()),
    orNull(fetchLastReconcileJob()),
  ]);

  if (!list.ok) return <LoansLoadError what="trades" reference={list.reference} />;
  const { content, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(tradebookUrl({ ...state, page: totalPages - 1 }));
  }

  return (
    <TradebookView
      state={state}
      rows={content.map(tradebookRow)}
      totalElements={totalElements}
      totalPages={totalPages}
      brokers={(brokers ?? []).map((b) => ({ id: b.id, name: b.name }))}
      today={todayInAppZone()}
      jobLines={[jobLine('Last import', lastImport, true), jobLine('Last reconcile', lastReconcile, false)]}
    />
  );
}
