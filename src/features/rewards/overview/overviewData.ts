import { signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import { accountsApi } from '@/lib/apiClient';
import { AccountType } from '@/lib/types';

import { buildOverview, type CardTotal, type RewardsOverviewModel } from './overviewModel';

export interface RewardsOverviewData {
  /** Null when the accounts or the totals request failed. */
  model: RewardsOverviewModel | null;
}

/** The accounts the overview lists: every open credit card, plus any other open account the totals report. */
export function overviewCards(accounts: readonly Account[], totals: readonly CardTotal[] = []): Account[] {
  const reported = new Set(totals.map((t) => t.accountId));
  return accounts.filter(
    (a) => !isAccountClosed(a) && (a.type === AccountType.CREDIT_CARD || reported.has(a.id))
  );
}

/**
 * Everything the Rewards overview needs: the accounts and the reward-year total of every account with rewards
 * (one request). Points are unvalued when the totals row carries no point value.
 */
export async function loadRewardsOverviewData(): Promise<RewardsOverviewData> {
  const [accounts, totals] = await Promise.all([
    accountsApi.list().catch(async (error: unknown) => {
      await signInIfSessionEnded(error);
      return null;
    }),
    serverApi.GET('/api/v1/rewards/totals').then(
      (r) => (r.data as CardTotal[] | undefined) ?? null,
      () => null
    ),
  ]);
  if (!accounts || !totals) return { model: null };
  const unvalued = new Set(totals.filter((t) => t.points > 0 && t.pointValueInr == null).map((t) => t.accountId));
  return { model: buildOverview(overviewCards(accounts, totals), totals, unvalued) };
}
