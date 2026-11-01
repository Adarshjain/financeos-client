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
  fetchUncategorizedExists,
} from '@/features/transactions/list/transactionsServerApi';
import { parseTransactionsUrl, remapLegacyCategoryParams } from '@/features/transactions/list/transactionsUrl';
import { TransactionsScreen } from '@/features/transactions/TransactionsScreen';
import { fetchCategoryList } from '@/lib/categoryList.server';
import { todayInAppZone } from '@/lib/date-range';

export const metadata = { title: 'Transactions' };

/**
 * /transactions: the list, filtered and sorted by the address. The server reads the address once and
 * fetches the page, the accounts and tags the chips need, the category list and the needs-review count together.
 */
export default async function DsTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const accountsRequest = orNull(fetchAccounts());
  const tagsRequest = orNull(fetchTags());
  const categoryListRequest = orNull(fetchCategoryList());
  // An old link's `category` carried a tag; it becomes a `tag` before the one fetch. Only a link that has one waits for the two lists.
  const raw = params.category === undefined ? params : remapLegacyCategoryParams(params, ((await categoryListRequest) ?? []).map((c) => c.key), (await tagsRequest) ?? []);
  const query = parseTransactionsUrl(raw);
  const [page, accounts, categories, needsReviewCount, categoryList, uncategorizedExists] = await Promise.all([
    loaded(fetchTransactionsPage(query)),
    accountsRequest,
    tagsRequest,
    orNull(fetchNeedsReviewCount()),
    categoryListRequest,
    orNull(fetchUncategorizedExists()),
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
      hasUncategorized={uncategorizedExists?.exists === true}
      needsReviewCount={needsReviewCount}
    />
  );
}
