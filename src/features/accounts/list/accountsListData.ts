import { signInIfSessionEnded } from '@/features/shell/loadHelpers';
import type { Account } from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import type { CardBillResponse } from '@/lib/api/types';
import { accountsApi, billsApi, dashboardsApi, investmentsApi } from '@/lib/apiClient';
import { BUILTIN_NET_WORTH } from '@/lib/dashboards.helpers';

import type { RewardTotal } from './accountsListModel';

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

/** Resolves to null instead of rejecting, so an optional piece degrades on its own. */
function orNull<T>(request: Promise<T>): Promise<T | null> {
  return request.catch(() => null);
}

export interface AccountsResult {
  /** Null when the accounts request failed; `errorReference` then carries the request id. */
  accounts: Account[] | null;
  errorReference?: string;
}

/** Every request the accounts list makes, already in flight; none of the promises rejects. */
export interface AccountsListData {
  accounts: Promise<AccountsResult>;
  /** The optional pieces resolve to null when their request failed. */
  bills: Promise<CardBillResponse[] | null>;
  rewards: Promise<RewardTotal[] | null>;
  netWorth: Promise<number | null>;
  dayChangePct: Promise<number | null>;
}

/**
 * Starts all five requests at once and returns their promises without awaiting the optional
 * ones, so the page can render as soon as the accounts arrive and stream the rest in.
 */
export function loadAccountsListData(): AccountsListData {
  return {
    accounts: accountsApi.list().then(
      (accounts): AccountsResult => ({ accounts }),
      async (error: unknown): Promise<AccountsResult> => {
        await signInIfSessionEnded(error);
        return { accounts: null, errorReference: error instanceof ApiError ? error.requestId : undefined };
      }
    ),
    bills: orNull(billsApi.list()),
    rewards: orNull(rewardTotals()),
    netWorth: orNull(netWorth()),
    dayChangePct: orNull(dayChangePct()),
  };
}
