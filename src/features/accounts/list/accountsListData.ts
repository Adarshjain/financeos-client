import type { Account } from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import type { CardBillResponse } from '@/lib/api/types';
import { accountsApi, billsApi, dashboardsApi, investmentsApi } from '@/lib/apiClient';
import { BUILTIN_NET_WORTH } from '@/lib/dashboards.helpers';

import type { RewardTotal } from './accountsList';

async function rewardTotals(): Promise<RewardTotal[]> {
  const { data } = await serverApi.GET('/api/v1/rewards/totals');
  return (data as RewardTotal[] | undefined) ?? [];
}

async function netWorth(): Promise<number | null> {
  const data = await dashboardsApi.builtinData(BUILTIN_NET_WORTH, {});
  return data.type === 'KPI' && data.value != null ? Number(data.value) : null;
}

async function dayChangePct(): Promise<number | null> {
  const summary = await investmentsApi.getSummary();
  const pct = summary?.dayChangePct;
  return pct == null ? null : Number(pct);
}

export interface AccountsListData {
  /** Null when the accounts request failed; `errorReference` then carries the request id. */
  accounts: Account[] | null;
  errorReference?: string;
  /** Null when its request failed. */
  bills: CardBillResponse[] | null;
  rewards: RewardTotal[] | null;
  netWorth: number | null;
  dayChangePct: number | null;
}

/** Everything the accounts list needs, fetched in parallel; only the accounts request is required. */
export async function loadAccountsListData(): Promise<AccountsListData> {
  const [accounts, bills, rewards, worth, day] = await Promise.allSettled([
    accountsApi.list(),
    billsApi.list(),
    rewardTotals(),
    netWorth(),
    dayChangePct(),
  ]);
  return {
    accounts: accounts.status === 'fulfilled' ? accounts.value : null,
    errorReference:
      accounts.status === 'rejected' && accounts.reason instanceof ApiError
        ? accounts.reason.requestId
        : undefined,
    bills: bills.status === 'fulfilled' ? bills.value : null,
    rewards: rewards.status === 'fulfilled' ? rewards.value : null,
    netWorth: worth.status === 'fulfilled' ? worth.value : null,
    dayChangePct: day.status === 'fulfilled' ? day.value : null,
  };
}
