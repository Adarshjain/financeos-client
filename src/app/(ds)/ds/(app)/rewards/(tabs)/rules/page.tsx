import { HydrationBoundary } from '@tanstack/react-query';

import { RewardsLoadError } from '@/features/accounts/detail/rewards/RewardsStates';
import { RulesPage } from '@/features/rewards/rules-page/RulesPage';
import { loadRulesPageData } from '@/features/rewards/rules-page/rulesPageData';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsRewardRulesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The card is read from the address before the first fetch, so a chosen card never loads twice.
  const today = todayInAppZone();
  const data = await loadRulesPageData((await searchParams)?.account, today);
  if (!data) return <RewardsLoadError what="rewards rules" />;
  return (
    <HydrationBoundary state={data.state}>
      <RulesPage accountId={data.accountId} usage={data.usage} today={today} />
    </HydrationBoundary>
  );
}
