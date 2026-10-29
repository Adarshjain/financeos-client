import { dehydrate,type DehydratedState } from '@tanstack/react-query';

import { rewardsWindowFor } from '@/features/accounts/detail/overview/rewardsWindowModel';
import { type Loaded, loaded, signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { serverApi } from '@/lib/api/server';
import { accountsApi, categoriesApi, rewardsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import { accountAnniversaryDate, pickRewardsAccount, rewardEligibleAccounts } from '@/lib/rewards.types';

import { buildUsage, type RulesUsage } from './rulesPageModel';

export interface RulesPageData {
  /** The card whose rules show; empty when the user has no account that can earn. */
  accountId: string;
  state: DehydratedState;
  /** The card's reward-year figures; null when the report could not load. */
  usage: RulesUsage | null;
}

/** `?account=`: the card whose rules show. */
export function parseRulesUrl(params: SearchParamsRecord): { account: string | undefined } {
  return { account: first(params.account) };
}

/**
 * Everything the Earning rules page needs, loaded before the first render: the accounts and categories, the chosen card's
 * rules, caps, milestones and config (hydrated, so nothing loads twice), and its reward-year report for the usage bars.
 * Not ok (with the request reference) when the accounts could not load.
 */
export async function loadRulesPageData(
  requested: string | string[] | undefined,
  today: string
): Promise<Loaded<RulesPageData>> {
  const [accountsResult, categories] = await Promise.all([
    loaded(accountsApi.list()),
    categoriesApi.list().catch(() => []),
  ]);
  if (!accountsResult.ok) return accountsResult;
  const accounts = accountsResult.data;
  const account = pickRewardsAccount(rewardEligibleAccounts(accounts), requested);
  const accountId = account?.id ?? '';

  const qc = getQueryClient();
  qc.setQueryData(keys.accounts.list(), accounts);
  qc.setQueryData(keys.categories.list(), categories);
  if (!account) return { ok: true, data: { accountId, state: dehydrate(qc), usage: null } };

  const [, totals] = await Promise.all([
    Promise.all([
      qc.prefetchQuery({ queryKey: keys.rewards.rules(accountId), queryFn: () => rewardsApi.listRules(accountId) }),
      qc.prefetchQuery({ queryKey: keys.rewards.capBuckets(accountId), queryFn: () => rewardsApi.listCapBuckets(accountId) }),
      qc.prefetchQuery({ queryKey: keys.rewards.milestones(accountId), queryFn: () => rewardsApi.listMilestones(accountId) }),
      qc.prefetchQuery({ queryKey: keys.rewards.config(accountId), queryFn: () => rewardsApi.getAccountConfig(accountId) }),
    ]),
    serverApi.GET('/api/v1/rewards/totals').then((r) => r.data ?? null, () => null),
  ]);
  await signInIfPrefetchFailed(qc, keys.rewards.rules(accountId));

  // The card's own reward year, as its rewards page reports it.
  const mine = totals?.find((t) => t.accountId === accountId);
  const window = mine ? { from: mine.from, to: mine.to } : rewardsWindowFor(accountAnniversaryDate(account), today);
  // The usage strip is optional: a failed report only hides it.
  const report = await rewardsApi.getReport(accountId, window.from, window.to).catch(() => null);
  const rules = qc.getQueryData<Awaited<ReturnType<typeof rewardsApi.listRules>>>(keys.rewards.rules(accountId)) ?? [];
  const caps = qc.getQueryData<Awaited<ReturnType<typeof rewardsApi.listCapBuckets>>>(keys.rewards.capBuckets(accountId)) ?? [];
  return { ok: true, data: { accountId, state: dehydrate(qc), usage: report ? buildUsage(report, rules, caps, today) : null } };
}
