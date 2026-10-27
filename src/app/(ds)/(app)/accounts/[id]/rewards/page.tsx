import { notFound } from 'next/navigation';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { accountTabsFor } from '@/features/accounts/detail/accountTabsModel';
import { loadRewardsTabData, type RewardsSearchParams } from '@/features/accounts/detail/rewards/rewardsData';
import { RewardsTab } from '@/features/accounts/detail/rewards/RewardsTab';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAccountRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<RewardsSearchParams>;
}) {
  const { id } = await params;
  const account = await loadAccount(id);
  if (!account || !accountTabsFor(account.type).some((t) => t.id === 'rewards')) notFound();
  const today = todayInAppZone();
  const data = await loadRewardsTabData(account, today, searchParams ? await searchParams : undefined);
  return <RewardsTab account={account} today={today} data={data} />;
}
