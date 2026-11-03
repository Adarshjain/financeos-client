import { loadAccountsListData } from '@/features/accounts/list/accountsListData';
import { AccountsScreen } from '@/features/accounts/list/AccountsScreen';
import { todayInAppZone } from '@/lib/date-range';

export const metadata = { title: 'Accounts' };

export default async function DsAccountsPage() {
  // All six requests start now; the accounts and the suggestions are awaited together (the rows need both), the rest stream in.
  const streams = loadAccountsListData();
  const [data, suggestions] = await Promise.all([streams.accounts, streams.suggestions]);
  return <AccountsScreen streams={streams} data={data} suggestions={suggestions} today={todayInAppZone()} />;
}
