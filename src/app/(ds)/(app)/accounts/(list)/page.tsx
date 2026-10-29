import { loadAccountsListData } from '@/features/accounts/list/accountsListData';
import { AccountsScreen } from '@/features/accounts/list/AccountsScreen';
import { todayInAppZone } from '@/lib/date-range';

export const metadata = { title: 'Accounts' };

export default async function DsAccountsPage() {
  // All five requests start now; only the accounts are awaited, the rest stream in.
  const streams = loadAccountsListData();
  const data = await streams.accounts;
  return <AccountsScreen streams={streams} data={data} today={todayInAppZone()} />;
}
