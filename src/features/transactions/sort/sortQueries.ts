import type { QueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadUncategorizedGroups, loadUncategorizedSummary } from '@/lib/query/actions/uncategorizedActions';
import { keys } from '@/lib/query/keys';

import { SORT_PAGE_SIZE } from './sortModel';

/** Zero: every open re-reads; the cache only shows meanwhile. */
const STALE = 0;

/** One page of groups; `q` (trimmed by the caller) narrows them by name on the server. */
export const sortGroupsQuery = (page: number, q = '') => ({
  queryKey: keys.transactions.uncategorizedGroups(page, SORT_PAGE_SIZE, q),
  queryFn: () => unwrapAction(q ? loadUncategorizedGroups(page, SORT_PAGE_SIZE, q) : loadUncategorizedGroups(page, SORT_PAGE_SIZE)),
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
