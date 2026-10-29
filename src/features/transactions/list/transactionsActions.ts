'use server';

import { createDomainAction } from '@/lib/domainApi';

import { fetchMatchingCount, fetchNeedsReviewCount } from './transactionsServerApi';
import type { TransactionsQuery } from './transactionsUrl';

/** "Show N transactions" in the Filters dialog: how many a draft query matches. */
export const loadMatchingCount = createDomainAction(
  { fallbackError: "Couldn't count the transactions. Try again." },
  (query: TransactionsQuery): Promise<number> => fetchMatchingCount(query),
);

/** The Transactions badge: how many need review. */
export const loadNeedsReviewCount = createDomainAction(
  { fallbackError: "Couldn't load the review count. Try again." },
  (): Promise<number> => fetchNeedsReviewCount(),
);
