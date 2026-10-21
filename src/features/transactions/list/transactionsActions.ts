'use server';

import { createDomainAction } from '@/lib/domainApi';

import { fetchMatchingCount, fetchNeedsReviewCount } from './transactionsServerApi';
import type { TransactionsQuery } from './transactionsUrl';

/** "Show N transactions" in the Filters dialog: how many a draft query matches. */
export const loadMatchingCount = createDomainAction(
  { fallbackError: 'Failed to count the transactions' },
  (query: TransactionsQuery): Promise<number> => fetchMatchingCount(query),
);

/** The Transactions badge: how many need review. */
export const loadNeedsReviewCount = createDomainAction(
  { fallbackError: 'Failed to load the review count' },
  (): Promise<number> => fetchNeedsReviewCount(),
);
