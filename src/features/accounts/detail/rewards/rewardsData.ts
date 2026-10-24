import type { Account } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import { rewardsApi } from '@/lib/apiClient';
import { accountAnniversaryDate, type PagedRewardLines, type RewardReport, type RewardRule } from '@/lib/rewards.types';

import { type RewardsWindow,rewardsWindowFor } from '../overview/rewardsWindow';
import { clampedPage, parseRewardsQuery, type RewardsQuery } from './rewardsModel';
import { resolvePeriod } from './rewardsPeriod';

export interface RewardsTabData {
  window: RewardsWindow;
  /** Each piece is null when its own request failed. */
  report: RewardReport | null;
  rules: RewardRule[] | null;
  lines: PagedRewardLines | null;
  query: RewardsQuery;
}

export type RewardsSearchParams = {
  rule?: string | string[];
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
  page?: string | string[];
  size?: string | string[];
};

const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

/**
 * Everything the Rewards tab needs. The rule list loads alongside the reward year (the default period); once both are in, the
 * report and one page of earning lines load in parallel (the rule list validates the `?rule=` filter).
 */
export async function loadRewardsTabData(
  account: Account,
  today: string,
  params: RewardsSearchParams | undefined
): Promise<RewardsTabData> {
  const accountId = account.id;
  const rulesPending = Promise.allSettled([rewardsApi.listRules(accountId)]);
  const totals = await serverApi.GET('/api/v1/rewards/totals').then((r) => r.data ?? null, () => null);
  const mine = totals?.find((t) => t.accountId === accountId);
  const anniversary = accountAnniversaryDate(account);
  const reportYear: RewardsWindow = mine
    ? { from: mine.from, to: mine.to, calendarYear: mine.calendarYearFallback }
    : rewardsWindowFor(anniversary, today);
  // The period is read from the address before the first fetch, so a chosen period never loads twice.
  const window = resolvePeriod(parseRewardsQuery(params, []), reportYear, today, anniversary);
  const reportPending = Promise.allSettled([rewardsApi.getReport(accountId, window.from, window.to)]);
  const rules = ok((await rulesPending)[0]);
  let query = parseRewardsQuery(params, (rules ?? []).map((r) => r.id));
  const fetchLines = (page: number) =>
    rewardsApi.getRewardLines({
      accountId,
      from: window.from,
      to: window.to,
      ruleId: query.ruleId,
      page,
      size: query.size,
    });
  let lines = ok((await Promise.allSettled([fetchLines(query.page)]))[0]);
  // A page past the end (a stale link, or a filter that shrank the list) shows the last page instead.
  const last = lines ? clampedPage(query.page, query.size, lines.totalElements) : null;
  if (last != null) {
    query = { ...query, page: last };
    lines = ok((await Promise.allSettled([fetchLines(last)]))[0]);
  }
  return { window, report: ok((await reportPending)[0]), rules, lines, query };
}
