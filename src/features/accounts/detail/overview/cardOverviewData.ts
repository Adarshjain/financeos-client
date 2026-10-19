import { type Cardholder, type CreditCard, isAccountClosed } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import type { CardBillResponse } from '@/lib/api/types';
import { accountsApi, billsApi, cardholdersApi, rewardsApi, transactionsApi } from '@/lib/apiClient';
import type { RewardReport } from '@/lib/rewards.types';
import type { CardCycleSummary } from '@/lib/statement.types';
import type { Transaction } from '@/lib/transaction.types';

import { loadBillsHistory } from '../billsHistory';
import { type BillEntry } from '../billsHistoryModel';
import type { CardholderStats } from './cardOverviewModel';
import { type RewardsWindow, rewardsWindowFor } from './rewardsWindow';

export const RECENT_TRANSACTIONS = 8;

export interface CardOverviewData {
  /** Each piece is null when its own request failed. */
  summary: CardCycleSummary | null;
  bill: CardBillResponse | null;
  /** The latest statements with their bills; null when the statements request failed. */
  billHistory: BillEntry[] | null;
  cardholders: Cardholder[] | null;
  stats: CardholderStats[] | null;
  identifiers: string[] | null;
  rewards: { report: RewardReport; window: RewardsWindow } | null;
  recent: { items: Transaction[]; total: number } | null;
  gmail: { lastMatchDate: string | null; unmatchedCount: number } | null;
}

async function loadStats(accountId: string): Promise<CardholderStats[]> {
  const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/cardholders/stats', {
    params: { path: { accountId } },
  });
  return (data as CardholderStats[] | undefined) ?? [];
}

async function loadIdentifiers(id: string): Promise<string[]> {
  const { data } = await serverApi.GET('/api/v1/accounts/{id}/identifiers', { params: { path: { id } } });
  return (data ?? []).map((i) => i.value);
}

async function loadGmail(id: string) {
  const { data } = await serverApi.GET('/api/v1/accounts/{id}/gmail-summary', { params: { path: { id } } });
  return {
    lastMatchDate: data?.lastAlert?.date ?? null,
    unmatchedCount: data?.unmatchedCount ?? 0,
  };
}

/** The window the totals endpoint reports for this card; if that call fails or has no entry, computed from the anniversary date. */
async function loadRewards(account: CreditCard, today: string) {
  const mine = await serverApi
    .GET('/api/v1/rewards/totals')
    .then(({ data }) => data?.find((t) => t.accountId === account.id))
    .catch(() => undefined);
  const window: RewardsWindow = mine
    ? { from: mine.from, to: mine.to, calendarYear: mine.calendarYearFallback }
    : rewardsWindowFor(account.anniversaryDate, today);
  const report = await rewardsApi.getReport(account.id, window.from, window.to);
  return { report, window };
}

async function loadRecent(accountId: string) {
  const page = await transactionsApi.search(
    { filters: [{ field: 'accountId', operator: 'is', value: accountId }] },
    { page: 0, size: RECENT_TRANSACTIONS, sort: ['date,desc'] }
  );
  return { items: page.content, total: page.totalElements };
}

const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

/** Everything the card Overview needs, fetched in parallel; each piece degrades on its own. */
export async function loadCardOverviewData(
  account: CreditCard,
  today: string
): Promise<CardOverviewData> {
  const id = account.id;
  const [summary, bills, billHistory, cardholders, stats, identifiers, rewards, recent, gmail] =
    await Promise.allSettled([
      accountsApi.getCardCycleSummary(id),
      billsApi.list(id),
      loadBillsHistory(id),
      cardholdersApi.list(id),
      loadStats(id),
      loadIdentifiers(id),
      isAccountClosed(account, today) ? Promise.resolve(null) : loadRewards(account, today),
      loadRecent(id),
      loadGmail(id),
    ]);
  const billList = ok(bills);
  return {
    summary: ok(summary),
    billHistory: ok(billHistory),
    bill: billList?.find((b) => b.accountId === id) ?? billList?.[0] ?? null,
    cardholders: ok(cardholders),
    stats: ok(stats),
    identifiers: ok(identifiers),
    rewards: ok(rewards),
    recent: ok(recent),
    gmail: ok(gmail),
  };
}
