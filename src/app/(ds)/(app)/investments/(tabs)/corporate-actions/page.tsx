import { redirect } from 'next/navigation';
import React from 'react';

import { CorporateActionsList } from '@/features/investments/corporate-actions/CorporateActionsList';
import {
  corporateActionsQuery,
  corporateActionsUrl,
  parseCorporateActionsUrl,
} from '@/features/investments/corporate-actions/corporateActionsModel';
import { fetchCorporateActionsPage } from '@/features/investments/corporate-actions/corporateActionsServerApi';
import { LoadError } from '@/features/shell/LoadError';
import { loaded } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/corporate-actions: the recorded actions. The filters, sort and page are in the URL and answered by the server. */
export default async function DsCorporateActionsPage({ searchParams }: { searchParams: SearchParams }) {
  const state = parseCorporateActionsUrl(await searchParams);
  const list = await loaded(fetchCorporateActionsPage(corporateActionsQuery(state)));
  if (!list.ok) return <LoadError what="corporate actions" reference={list.reference} />;
  const { items, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(corporateActionsUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }
  return <CorporateActionsList state={state} items={items} totalElements={totalElements} totalPages={totalPages} />;
}
