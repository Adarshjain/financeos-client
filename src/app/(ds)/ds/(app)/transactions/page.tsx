import React from 'react';

import { loaded, orNull } from '@/features/shell/loadHelpers';
import { transactionRows } from '@/features/transactions/list/transactionRows';
import {
  fetchAccounts,
  fetchCategories,
  fetchNeedsReviewCount,
  fetchTransactionsPage,
} from '@/features/transactions/list/transactionsServerApi';
import { parseTransactionsUrl, type RawSearchParams } from '@/features/transactions/list/transactionsUrl';
import { type TransactionsListResult,TransactionsView } from '@/features/transactions/list/TransactionsView';
import { todayInAppZone } from '@/lib/date-range';

/**
 * /ds/transactions: the list, filtered and sorted by the address. The server reads the address once and
 * fetches the page, the accounts and categories the chips need, and the needs-review count together.
 */
export default async function DsTransactionsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseTransactionsUrl(await searchParams);
  const [page, accounts, categories, needsReviewCount] = await Promise.all([
    loaded(fetchTransactionsPage(query)),
    orNull(fetchAccounts()),
    orNull(fetchCategories()),
    orNull(fetchNeedsReviewCount()),
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
    <TransactionsView
      query={query}
      today={todayInAppZone()}
      list={list}
      accounts={accounts}
      categories={categories}
      needsReviewCount={needsReviewCount}
    />
  );
}
