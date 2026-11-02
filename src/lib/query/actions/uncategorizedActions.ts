'use server';

import { transactionsApi } from '@/lib/apiClient';
import type { CategoryPick } from '@/lib/categoryList.types';
import { createDomainAction } from '@/lib/domainApi';
import type { Page } from '@/lib/pagination';
import type {
  ApplyUncategorizedRequest,
  ApplyUncategorizedResponse,
  UncategorizedGroup,
  UncategorizedSummary,
  UncategorizedTransaction,
  UndoUncategorizedRequest,
  UndoUncategorizedResponse,
} from '@/lib/uncategorized.types';

/** The category picks to offer first, by direction. */
export const loadCategoryRecent = createDomainAction(
  { fallbackError: "Couldn't load recent categories. Try again." },
  async (direction: 'OUT' | 'IN'): Promise<CategoryPick[]> => transactionsApi.categoryRecent(direction),
);

/** The numbers behind Sort them, read when the dialog opens. */
export const loadUncategorizedSummary = createDomainAction(
  { fallbackError: "Couldn't load the count. Try again." },
  async (): Promise<UncategorizedSummary> => transactionsApi.uncategorizedSummary(),
);

export const loadUncategorizedGroups = createDomainAction(
  { fallbackError: "Couldn't load the groups. Try again." },
  async (page: number, size: number, q?: string): Promise<Page<UncategorizedGroup>> =>
    transactionsApi.uncategorizedGroups(q ? { page, size, q } : { page, size }),
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

export const undoUncategorized = createDomainAction(
  { fallbackError: "Couldn't put the categories back. Try again." },
  async (body: UndoUncategorizedRequest): Promise<UndoUncategorizedResponse> => transactionsApi.undoUncategorized(body),
);
