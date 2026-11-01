'use server';

import { transactionsApi } from '@/lib/apiClient';
import type { CategoryPick } from '@/lib/categoryList.types';
import { createDomainAction } from '@/lib/domainApi';
import type { Page } from '@/lib/pagination';
import type {
  ApplyUncategorizedRequest,
  ApplyUncategorizedResponse,
  UncategorizedGroup,
  UncategorizedTransaction,
} from '@/lib/uncategorized.types';

/** The category picks to offer first, by direction. */
export const loadCategoryRecent = createDomainAction(
  { fallbackError: "Couldn't load recent categories. Try again." },
  async (direction: 'OUT' | 'IN'): Promise<CategoryPick[]> => transactionsApi.categoryRecent(direction),
);

export const loadUncategorizedGroups = createDomainAction(
  { fallbackError: "Couldn't load the groups. Try again." },
  async (page: number, size: number): Promise<Page<UncategorizedGroup>> => transactionsApi.uncategorizedGroups({ page, size }),
);

export const loadGroupTransactions = createDomainAction(
  { fallbackError: "Couldn't load the transactions. Try again." },
  async (groupKey: string, page: number, size: number): Promise<Page<UncategorizedTransaction>> =>
    transactionsApi.uncategorizedGroupTransactions(groupKey, { page, size }),
);

export const applyUncategorized = createDomainAction(
  { fallbackError: "Couldn't set the categories. Try again." },
  async (body: ApplyUncategorizedRequest): Promise<ApplyUncategorizedResponse> => transactionsApi.applyUncategorized(body),
);
