import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { RULES_PAGE_SIZE } from '@/components/rules/browser/constants';
import { RulesBrowser } from '@/components/rules/RulesBrowser';
import { categoriesApi, rulesApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export default async function RulesPage() {
  const qc = getQueryClient();

  // Must mirror useRulesBrowser's initial state exactly — same query key,
  // same params — so the first client paint is served from this hydrated
  // cache instead of firing a redundant fetch.
  const listParams = { verified: false, search: undefined, page: 0, size: RULES_PAGE_SIZE };

  await Promise.all([
    qc.prefetchQuery({
      queryKey: keys.rules.list(listParams),
      queryFn: () => rulesApi.list(listParams),
    }),
    qc.prefetchQuery({
      queryKey: keys.categories.list(),
      queryFn: () => categoriesApi.list(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <RulesBrowser />
    </HydrationBoundary>
  );
}
