import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, fnoApi } from '@/lib/apiClient';
import { AccountType, FnoTradeListResponse } from '@/lib/types';

import { FnoView } from './FnoView';

export const metadata = {
  title: 'Futures & Options (FnO) | FinanceOS',
  description: 'Track derivative contracts, option trades, margins, and realized profit & loss.',
};

export default async function FnoPage() {
  const [fnoData, accounts] = await Promise.all([
    fnoApi.listTrades().catch(() => ({ trades: [], totalRealizedPnl: 0 } as FnoTradeListResponse)),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return <FnoView initialFnoData={fnoData} brokerAccounts={brokerAccounts} />;
}
