import type { QueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadUncategorizedGroups, loadUncategorizedSummary } from '@/lib/query/actions/uncategorizedActions';
import { keys } from '@/lib/query/keys';

import { SORT_PAGE_SIZE } from './sortModel';

/** Zero: every open re-reads; the cache only shows meanwhile. */
const STALE = 0;

export const sortGroupsQuery = (page: number) => ({
  queryKey: keys.transactions.uncategorizedGroups(page, SORT_PAGE_SIZE),
  queryFn: () => unwrapAction(loadUncategorizedGroups(page, SORT_PAGE_SIZE)),
  staleTime: STALE,
});

export const sortSummaryQuery = () => ({
  queryKey: keys.transactions.uncategorizedSummary(),
  queryFn: () => unwrapAction(loadUncategorizedSummary()),
  staleTime: STALE,
});

/** Starts the first groups page and the summary while the dialog's code is still loading. */
export function prefetchSort(queryClient: QueryClient): void {
  void queryClient.prefetchQuery(sortGroupsQuery(0));
  void queryClient.prefetchQuery(sortSummaryQuery());
}
