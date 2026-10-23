import { redirect } from 'next/navigation';
import React from 'react';

import { loaded, orNull } from '@/features/shell/loadHelpers';
import {
  clampedRulesUrl,
  parseRulesUrl,
  type RuleCounts,
  ruleCounts,
  rulesRequest,
  type RuleStatus,
} from '@/features/transactions/rules/rulesModel';
import { RulesScreen } from '@/features/transactions/rules/RulesScreen';
import { categoriesApi, rulesApi } from '@/lib/apiClient';

/** How many rules a status holds under the page's search and filters: a one-row page's total. */
async function countFor(state: ReturnType<typeof parseRulesUrl>, status: RuleStatus): Promise<number> {
  return (await rulesApi.list({ ...rulesRequest(state, status), page: 0, size: 1 })).totalElements;
}

/**
 * /ds/transactions/rules: one page of rules, filtered by the address (it opens on Unverified), with the three status
 * counts and the categories the filter and the form need. The server reads the address once and fetches them together.
 */
export default async function DsRulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = parseRulesUrl(await searchParams);
  const [result, unverified, verified, categories] = await Promise.all([
    loaded(rulesApi.list({ ...rulesRequest(state), page: state.page, size: state.size })),
    orNull(countFor(state, 'unverified')),
    orNull(countFor(state, 'verified')),
    orNull(categoriesApi.list()),
  ]);
  const clamped = result.ok ? clampedRulesUrl(state, result.data) : null;
  if (clamped) redirect(clamped);
  const counts: RuleCounts | null = unverified !== null && verified !== null ? ruleCounts(unverified, verified) : null;
  return (
    <RulesScreen
      rules={
        result.ok
          ? { rows: result.data.content, totalElements: result.data.totalElements, totalPages: result.data.totalPages }
          : null
      }
      reference={result.ok ? undefined : result.reference}
      state={state}
      counts={counts}
      categories={categories}
    />
  );
}
