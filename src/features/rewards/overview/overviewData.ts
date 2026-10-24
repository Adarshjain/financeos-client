import { signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import { accountsApi, rewardsApi } from '@/lib/apiClient';
import { AccountType } from '@/lib/types';

import { buildOverview, type CardTotal, type RewardsOverviewModel } from './overviewModel';

export interface RewardsOverviewData {
  /** Null when the accounts or the totals request failed. */
  model: RewardsOverviewModel | null;
}

/** The credit cards the overview lists. */
export function overviewCards(accounts: readonly Account[]): Account[] {
  return accounts.filter((a) => a.type === AccountType.CREDIT_CARD && !isAccountClosed(a));
}

/**
 * Everything the Rewards overview needs: the accounts and every card's reward-year total (one request each),
 * then the point value of each card that earned points, to tell valued points (already in the ₹) from unvalued ones.
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
  const cards = overviewCards(accounts);
  const withPoints = cards.filter((c) => (totals.find((t) => t.accountId === c.id)?.points ?? 0) > 0);
  const configs = await Promise.allSettled(withPoints.map((c) => rewardsApi.getConfig(c.id)));
  // A card whose point value could not be read is treated as valued: never claim points are unvalued without knowing.
  const unvalued = new Set(
    withPoints.filter((_, i) => {
      const c = configs[i];
      return c.status === 'fulfilled' && c.value.pointValueInr == null;
    }).map((c) => c.id)
  );
  return { model: buildOverview(cards, totals, unvalued) };
}
