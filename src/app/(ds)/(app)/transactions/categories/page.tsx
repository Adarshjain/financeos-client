import { redirect } from 'next/navigation';
import React from 'react';

import { loaded, orNull } from '@/features/shell/loadHelpers';
import {
  CATEGORIES_PAGE_SIZE,
  clampedCategoriesUrl,
  parseCategoriesUrl,
  uncategorizedData,
} from '@/features/transactions/categories/categoriesModel';
import { CategoriesScreen } from '@/features/transactions/categories/CategoriesScreen';
import { fetchTransactionsPage } from '@/features/transactions/list/transactionsServerApi';
import { DEFAULT_QUERY, transactionsUrl } from '@/features/transactions/list/transactionsUrl';
import { categoriesApi } from '@/lib/apiClient';

const UNCATEGORIZED_QUERY = { ...DEFAULT_QUERY, uncategorized: true, size: 3 };
/** Review shows all of them in the list, at its own page size. */
const REVIEW_HREF = transactionsUrl({ ...DEFAULT_QUERY, uncategorized: true });

/**
 * /transactions/categories: one page of categories by name, filtered by the search in the address, and
 * the Uncategorized card (how many transactions have no category, and the latest three), fetched together.
 */
export default async function DsCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = parseCategoriesUrl(await searchParams);
  const [result, untagged] = await Promise.all([
    loaded(categoriesApi.page({ search: state.q || undefined, page: state.page, size: CATEGORIES_PAGE_SIZE })),
    orNull(fetchTransactionsPage(UNCATEGORIZED_QUERY)),
  ]);
  const clamped = result.ok ? clampedCategoriesUrl(state, result.data) : null;
  if (clamped) redirect(clamped);
  return (
    <CategoriesScreen
      categories={
        result.ok
          ? { rows: result.data.content, totalElements: result.data.totalElements, totalPages: result.data.totalPages }
          : null
      }
      reference={result.ok ? undefined : result.reference}
      state={state}
      uncategorized={untagged ? (uncategorizedData(untagged, REVIEW_HREF) ?? undefined) : undefined}
    />
  );
}
