import { notFound } from 'next/navigation';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { AccountOverview } from '@/features/accounts/detail/overview/AccountOverview';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAccountOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await loadAccount(id);
  if (!account) notFound();
  return <AccountOverview account={account} today={todayInAppZone()} />;
}
