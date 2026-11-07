import type { AccountSuggestions } from '@/features/accounts/list/suggestionsModel';
import { type RetirementModel } from '@/features/investments/retirement/retirementModel';
import { loadRetirementScreen } from '@/features/investments/retirement/retirementScreenData';
import { loadLoansCard,type LoansCardData } from '@/features/loans/list/loansCardData';
import { type Loaded, signInIfSessionEnded } from '@/features/shell/loadHelpers';
import type { Account } from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import type { CardBillResponse } from '@/lib/api/types';
import { accountsApi, accountSuggestionsApi, billsApi, dashboardsApi, investmentsApi } from '@/lib/apiClient';
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
  /** The accounts found in the user's email and the scan's progress; null when the request failed. */
  suggestions: Promise<AccountSuggestions | null>;
  /** The EPF and NPS rows: the Retirement card, and what the Investments figure adds to the brokers. */
  retirement: Promise<Loaded<RetirementModel>>;
  /** The open loans of the Loans card; null when they could not be read. */
  loans: Promise<LoansCardData | null>;
}

/**
 * Starts all eight requests at once and returns their promises without awaiting the optional
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
    suggestions: orNull(accountSuggestionsApi.list()),
    retirement: loadRetirementScreen(),
    loans: loadLoansCard(),
  };
}
