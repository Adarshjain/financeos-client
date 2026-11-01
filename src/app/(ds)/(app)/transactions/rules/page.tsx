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
import { rulesApi } from '@/lib/apiClient';
import { fetchCategoryList } from '@/lib/categoryList.server';

export const metadata = { title: 'Tags' };

/**
 * /transactions/rules (the Tags tab; its page is rebuilt next): one page of rules, filtered by the address, with the
 * category list the filter and the form need. The server reads the address once and fetches them together.
 */
export default async function DsRulesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const state = parseRulesUrl(await searchParams);
  const [result, categoryList] = await Promise.all([
    loaded(rulesApi.list({ ...rulesRequest(state), page: state.page, size: state.size })),
    orNull(fetchCategoryList()),
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
      categoryList={categoryList}
    />
  );
}
