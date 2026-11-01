import type { Schemas } from '@/lib/api/types';

/** The Uncategorized card's numbers: how many need a category, how many groups of two or more, the biggest groups. */
export type UncategorizedSummary = Schemas['UncategorizedSummaryResponse'];
/** One group of uncategorized transactions (a shop or a person); a one-off has a single transaction. */
export type UncategorizedGroup = Schemas['UncategorizedGroupResponse'];
/** One transaction of a group, with where it was paid from. */
export type UncategorizedTransaction = Schemas['UncategorizedTransactionResponse'];
export type ApplyUncategorizedRequest = Schemas['ApplyUncategorizedRequest'];
export type ApplyUncategorizedResponse = Schemas['ApplyUncategorizedResponse'];
/** Transactions per category and sub-category: the Category filter's counts. */
export type CategoryCounts = Schemas['CategoryCountsResponse'];
