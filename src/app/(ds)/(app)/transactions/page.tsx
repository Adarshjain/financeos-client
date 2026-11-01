import React from 'react';

import { loaded, orNull } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { transactionRows } from '@/features/transactions/list/transactionRowsModel';
import type { TransactionsListResult } from '@/features/transactions/list/TransactionsListPane';
import {
  fetchAccounts,
  fetchNeedsReviewCount,
  fetchTags,
  fetchTransactionsPage,
} from '@/features/transactions/list/transactionsServerApi';
import { parseTransactionsUrl } from '@/features/transactions/list/transactionsUrl';
import { TransactionsScreen } from '@/features/transactions/TransactionsScreen';
import { fetchCategoryList } from '@/lib/categoryList.server';
import { todayInAppZone } from '@/lib/date-range';

export const metadata = { title: 'Transactions' };

/**
 * /transactions: the list, filtered and sorted by the address. The server reads the address once and
 * fetches the page, the accounts and tags the chips need, the category list and the needs-review count together.
 */
export default async function DsTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseTransactionsUrl(await searchParams);
  const [page, accounts, categories, needsReviewCount, categoryList] = await Promise.all([
    loaded(fetchTransactionsPage(query)),
    orNull(fetchAccounts()),
    orNull(fetchTags()),
    orNull(fetchNeedsReviewCount()),
    orNull(fetchCategoryList()),
  ]);

  const list: TransactionsListResult = page.ok
    ? {
        ok: true,
        // Where each came from shows in the Needs review view only.
        rows: transactionRows(page.data.content, { accounts, showSource: query.review === 'NEEDS_REVIEW' }),
        totalElements: page.data.totalElements,
        totalPages: page.data.totalPages,
      }
    : { ok: false, reference: page.reference };

  return (
    <TransactionsScreen
      query={query}
      today={todayInAppZone()}
      list={list}
      transactions={page.ok ? page.data.content : []}
      accounts={accounts}
      categories={categories}
      categoryList={categoryList}
      needsReviewCount={needsReviewCount}
    />
  );
}
