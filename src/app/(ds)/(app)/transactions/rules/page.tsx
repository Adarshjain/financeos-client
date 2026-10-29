import { redirect } from 'next/navigation';
import React from 'react';

import { loaded, orNull } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import {
  clampedRulesUrl,
  parseRulesUrl,
  rulesRequest,
} from '@/features/transactions/rules/rulesModel';
import { RulesScreen } from '@/features/transactions/rules/RulesScreen';
import { categoriesApi, rulesApi } from '@/lib/apiClient';

export const metadata = { title: 'Rules' };

/**
 * /transactions/rules: one page of rules, filtered by the address (it opens on Unverified), with the
 * categories the filter and the form need. The server reads the address once and fetches them together.
 */
export default async function DsRulesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const state = parseRulesUrl(await searchParams);
  const [result, categories] = await Promise.all([
    loaded(rulesApi.list({ ...rulesRequest(state), page: state.page, size: state.size })),
    orNull(categoriesApi.list()),
  ]);
  const clamped = result.ok ? clampedRulesUrl(state, result.data) : null;
  if (clamped) redirect(clamped);
  return (
    <RulesScreen
      rules={
        result.ok
          ? { rows: result.data.content, totalElements: result.data.totalElements, totalPages: result.data.totalPages }
          : null
      }
      reference={result.ok ? undefined : result.reference}
      state={state}
      categories={categories}
    />
  );
}
