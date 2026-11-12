import { redirect } from 'next/navigation';
import React from 'react';

import { CorporateActionReview } from '@/features/investments/corporate-actions/CorporateActionReview';
import { CorporateActionsList } from '@/features/investments/corporate-actions/CorporateActionsList';
import {
  corporateActionsQuery,
  corporateActionsUrl,
  parseCorporateActionsUrl,
} from '@/features/investments/corporate-actions/corporateActionsModel';
import { fetchCorporateActionReview, fetchCorporateActionsPage } from '@/features/investments/corporate-actions/corporateActionsServerApi';
import { LoadError } from '@/features/shell/LoadError';
import { loaded } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/corporate-actions: the recorded actions. The filters, sort and page are in the URL and answered by the server. */
export default async function DsCorporateActionsPage({ searchParams }: { searchParams: SearchParams }) {
  const state = parseCorporateActionsUrl(await searchParams);
  const [list, review] = await Promise.all([
    loaded(fetchCorporateActionsPage(corporateActionsQuery(state))),
    loaded(fetchCorporateActionReview()),
  ]);
  if (!list.ok) return <LoadError what="corporate actions" reference={list.reference} />;
  const { items, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(corporateActionsUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {review.ok ? <CorporateActionReview review={review.data} /> : null}
      <CorporateActionsList state={state} items={items} totalElements={totalElements} totalPages={totalPages} />
    </div>
  );
}
