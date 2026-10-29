import { requireAccount } from '@/features/accounts/detail/accountRoute';
import { AccountOverview } from '@/features/accounts/detail/overview/AccountOverview';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAccountOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireAccount((await params).id);
  return <AccountOverview account={account} today={todayInAppZone()} />;
}
