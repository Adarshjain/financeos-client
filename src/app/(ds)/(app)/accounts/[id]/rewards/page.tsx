import { requireAccount } from '@/features/accounts/detail/accountRoute';
import { accountTabsFor } from '@/features/accounts/detail/accountTabsModel';
import { loadRewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import { RewardsTab } from '@/features/accounts/detail/rewards/RewardsTab';
import { parseRewardsUrl } from '@/features/accounts/detail/rewards/rewardsUrl';
import type { SearchParams } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAccountRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const account = await requireAccount((await params).id, (a) => accountTabsFor(a.type).some((t) => t.id === 'rewards'));
  const today = todayInAppZone();
  const data = await loadRewardsTabData(account, today, parseRewardsUrl(await searchParams));
  return <RewardsTab account={account} today={today} data={data} />;
}
