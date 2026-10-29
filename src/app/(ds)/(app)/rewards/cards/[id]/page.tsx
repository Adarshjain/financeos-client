import type { Metadata } from 'next';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { requireAccount } from '@/features/accounts/detail/accountRoute';
import { accountTabsFor } from '@/features/accounts/detail/accountTabsModel';
import { loadRewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import { RewardsCardScreen } from '@/features/rewards/overview/RewardsCardScreen';
import type { SearchParams } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const account = await loadAccount((await params).id);
  return { title: account?.name ?? 'Rewards' };
}

/** A card's rewards: the same page body as Accounts → card → Rewards, under the Rewards top bar. */
export default async function DsRewardsCardPage({ params, searchParams }: Params & { searchParams: SearchParams }) {
  const account = await requireAccount((await params).id, (a) => accountTabsFor(a.type).some((t) => t.id === 'rewards'));
  const today = todayInAppZone();
  const data = await loadRewardsTabData(account, today, await searchParams);
  return <RewardsCardScreen account={account} today={today} data={data} />;
}
