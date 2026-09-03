import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, fnoApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import { AccountType, FnoTradeListResponse } from '@/lib/types';

import { FnoView } from './FnoView';

export const metadata = {
  title: 'Futures & Options (FnO) | FinanceOS',
  description:
    'Track derivative contracts, option trades, margins, and realized profit & loss.',
};

export default async function FnoPage() {
  const qc = getQueryClient();
  const [fnoData, accounts] = await Promise.all([
    fnoApi
      .listTrades(undefined)
      .catch((): FnoTradeListResponse => ({ trades: [], totalRealizedPnl: 0 })),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));
  qc.setQueryData(keys.investments.fno(), fnoData);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <FnoView brokerAccounts={brokerAccounts} />
    </HydrationBoundary>
  );
}
