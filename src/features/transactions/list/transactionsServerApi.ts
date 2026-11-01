import { accountsApi, tagsApi, transactionsApi } from '@/lib/apiClient';
import type { PagedTransaction } from '@/lib/transaction.types';

import { buildSearchBody, NEEDS_REVIEW_BODY, searchPaging } from './transactionsRequest';
import type { TransactionsQuery } from './transactionsUrl';

/** One page of the list for a query: the single fetch behind a URL. */
export function fetchTransactionsPage(query: TransactionsQuery): Promise<PagedTransaction> {
  return transactionsApi.search(buildSearchBody(query), searchPaging(query));
}

/** How many transactions match a query, whatever page it is on. */
export function fetchMatchingCount(query: TransactionsQuery): Promise<number> {
  return transactionsApi.count(buildSearchBody(query));
}

/** Everything that needs review: the "Needs review" chip and the Transactions nav badge. */
export function fetchNeedsReviewCount(): Promise<number> {
  return transactionsApi.count(NEEDS_REVIEW_BODY);
}

export const fetchAccounts = accountsApi.list;
/** Whether any transaction needs a category: the Uncategorized card shows only then (no count on load). */
export const fetchUncategorizedExists = transactionsApi.uncategorizedExists;
/** The user's tags with their counts: the list's Tags filter. */
export const fetchTags = tagsApi.list;
