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
import { rulesApi, tagsApi } from '@/lib/apiClient';
import { fetchCategoryList } from '@/lib/categoryList.server';

export const metadata = { title: 'Tags' };

/** Tags are a person's own few labels: the section reads them in one page. */
const TAGS_SIZE = 200;

/**
 * /transactions/rules (the Tags tab): the user's tags and one page of rules, filtered by the address, with the
 * category list the filter and the form need. The server reads the address once and fetches them together.
 */
export default async function DsRulesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const state = parseRulesUrl(await searchParams);
  const [tags, result, categoryList] = await Promise.all([
    loaded(tagsApi.page({ page: 0, size: TAGS_SIZE })),
    loaded(rulesApi.list({ ...rulesRequest(state), page: state.page, size: state.size })),
    orNull(fetchCategoryList()),
  ]);
  const clamped = result.ok ? clampedRulesUrl(state, result.data) : null;
  if (clamped) redirect(clamped);
  return (
    <RulesScreen
      tags={tags.ok ? { rows: tags.data.content, totalElements: tags.data.totalElements } : null}
      tagsReference={tags.ok ? undefined : tags.reference}
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
