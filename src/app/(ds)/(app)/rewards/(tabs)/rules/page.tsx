import { HydrationBoundary } from '@tanstack/react-query';

import { RulesPage } from '@/features/rewards/rules-page/RulesPage';
import { loadRulesPageData } from '@/features/rewards/rules-page/rulesPageData';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsRewardRulesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // The card is read from the address before the first fetch, so a chosen card never loads twice.
  const today = todayInAppZone();
  const result = await loadRulesPageData((await searchParams).account, today);
  if (!result.ok) return <LoadError what="rewards rules" reference={result.reference} />;
  const data = result.data;
  return (
    <HydrationBoundary state={data.state}>
      <RulesPage accountId={data.accountId} usage={data.usage} today={today} />
    </HydrationBoundary>
  );
}
