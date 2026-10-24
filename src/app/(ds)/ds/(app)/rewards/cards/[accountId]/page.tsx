import { notFound } from 'next/navigation';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { accountTabsFor } from '@/features/accounts/detail/accountTabsModel';
import { loadRewardsTabData, type RewardsSearchParams } from '@/features/accounts/detail/rewards/rewardsData';
import { RewardsTab } from '@/features/accounts/detail/rewards/RewardsTab';
import { REWARDS_HREF, rewardsCardHref } from '@/features/rewards/overview/rewardsTabs';
import { ShellPage } from '@/features/shell/ShellPage';
import { todayInAppZone } from '@/lib/date-range';

/** A card's rewards: the same page body as Accounts → card → Rewards, under the Rewards top bar. */
export default async function DsRewardsCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams?: Promise<RewardsSearchParams>;
}) {
  const { accountId } = await params;
  const account = await loadAccount(accountId);
  if (!account || !accountTabsFor(account.type).some((t) => t.id === 'rewards')) notFound();
  const today = todayInAppZone();
  const data = await loadRewardsTabData(account, today, searchParams ? await searchParams : undefined);
  return (
    <ShellPage crumb="Grow / Rewards" title={account.name} backHref={REWARDS_HREF}>
      <RewardsTab account={account} today={today} data={data} basePath={rewardsCardHref(account.id)} />
    </ShellPage>
  );
}
