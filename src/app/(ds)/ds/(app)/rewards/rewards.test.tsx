import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import type { RewardsOverviewData } from '@/features/rewards/overview/overviewData';
import type { Account } from '@/lib/account.types';
import type { MilestoneStatus, RewardLine, RewardReport, RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import Layout from './(tabs)/layout';
import OverviewPage from './(tabs)/page';
import CardPage from './cards/[accountId]/page';

class NotFoundSignal extends Error {}
const push = vi.fn();
const refresh = vi.fn();
let pathname = '/ds/rewards';
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundSignal('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push, refresh }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

const loadOverview = vi.fn<() => Promise<RewardsOverviewData>>();
vi.mock('@/features/rewards/overview/overviewData', () => ({ loadRewardsOverviewData: () => loadOverview() }));

const loadAccount = vi.fn<(id: string) => Promise<Account | null>>();
vi.mock('@/features/accounts/detail/accountData', () => ({ loadAccount: (id: string) => loadAccount(id) }));

const loadData = vi.fn<(...a: unknown[]) => Promise<RewardsTabData>>();
vi.mock('@/features/accounts/detail/rewards/rewardsData', () => ({ loadRewardsTabData: (...a: unknown[]) => loadData(...a) }));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const model = {
  total: '₹1,502 + 1,040 pts',
  cards: [
    { id: 'a', name: 'HDFC Regalia', subtitle: '••7741 · HDFC · anniversary year 15 Mar → 14 Mar', earned: '₹1,090', needsPointValue: false, href: '/ds/rewards/cards/a', setValueHref: '/rewards/rules?account=a' },
    { id: 'b', name: 'Amex Platinum', subtitle: '••1005 · anniversary year 1 Jan → 31 Dec', earned: '₹412 + 1,040 pts', needsPointValue: true, href: '/ds/rewards/cards/b', setValueHref: '/rewards/rules?account=b' },
  ],
};

describe('/ds/rewards', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    pathname = '/ds/rewards';
    loadOverview.mockReset().mockResolvedValue({ model });
  });

  const renderOverview = async () => renderWithQuery(<Layout>{await OverviewPage()}</Layout>);

  it('shows the three tabs, Overview open, pointing at their routes', async () => {
    await renderOverview();
    const tabs = ['Overview', 'Which card?', 'Earning rules'].map((n) => screen.getByRole('tab', { name: n }));
    expect(tabs.map((t) => t.getAttribute('href'))).toEqual(['/ds/rewards', '/ds/rewards/which-card', '/ds/rewards/rules']);
  });

  it('opens the tab of the address', async () => {
    pathname = '/ds/rewards/rules';
    await renderOverview();
    expect(screen.getByRole('tab', { name: 'Earning rules' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('false');
  });

  it('shows the all-cards total and one row per card, with no tiles', async () => {
    await renderOverview();
    expect(screen.getByText('Earned this year')).toBeDefined();
    expect(screen.getByText('₹1,502 + 1,040 pts')).toBeDefined();
    expect(screen.getByText('Each card over its own reward year')).toBeDefined();
    expect(screen.getByText('HDFC Regalia')).toBeDefined();
    expect(screen.getByText('••7741 · HDFC · anniversary year 15 Mar → 14 Mar')).toBeDefined();
    expect(screen.getByText('₹1,090')).toBeDefined();
    expect(screen.getByText('₹412 + 1,040 pts')).toBeDefined();
    expect(screen.queryByText('Eligible spend')).toBeNull();
  });

  it('opens a card’s rewards page when its row is tapped', async () => {
    await renderOverview();
    fireEvent.click(screen.getByText('HDFC Regalia'));
    expect(push).toHaveBeenCalledWith('/ds/rewards/cards/a');
  });

  it('offers Set point value only on a card with unvalued points, without opening the card', async () => {
    await renderOverview();
    const links = screen.getAllByRole('link', { name: 'Set point value' });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/rewards/rules?account=b');
    fireEvent.click(links[0]);
    expect(push).not.toHaveBeenCalled();
  });

  it('says so when there is no card, and offers Try again when the request failed', async () => {
    loadOverview.mockResolvedValue({ model: { total: '₹0', cards: [] } });
    const { unmount } = await renderOverview();
    expect(screen.getByText('No credit cards available')).toBeDefined();
    unmount();

    loadOverview.mockResolvedValue({ model: null });
    await renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();
  });
});

const card: Account = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'HDFC Regalia', last4: '7741', creditLimit: 300000, effectiveCreditLimit: 300000, balance: -1, ingestFromDate: '2026-01-01' };
const broker: Account = { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300 };

const rule = { id: 'r1', accountId: 'c1', name: '5X', priority: 1, stacking: 'EXCLUSIVE', accrualType: 'SLAB', rewardType: 'POINTS', slabSize: 150, pointsPerSlab: 4, createdAt: '', updatedAt: '' } as RewardRule;
const milestone: MilestoneStatus = {
  milestoneId: 'm1',
  name: 'Annual spend',
  windowType: 'ANNIVERSARY_YEAR',
  windowStart: '2026-03-15',
  windowEnd: '2027-03-14',
  basis: 'SPEND',
  threshold: 400000,
  progress: 83764,
  achieved: false,
  payoutType: 'CASH_VALUE',
  rewardType: 'POINTS',
  payoutValue: 10000,
  countedInSummary: false,
};
const report: RewardReport = {
  summary: { basisSpend: 83764, transactionCount: 30, matchedCount: 30, cashbackInr: 0, points: 2180, milestonesInr: 0, milestonesPts: 0, grossValueInr: 0, discounts: 0, fees: 0, effectiveValueInr: 0, pointsValueInr: null },
  rules: [
    {
      ruleId: 'r1',
      name: '5X',
      stacking: 'EXCLUSIVE',
      accrualType: 'SLAB',
      activeInRange: true,
      matchedCount: 3,
      basisMatched: 100,
      earned: 90,
      earnedUnit: 'POINTS',
      capStatus: { window: 'CALENDAR_MONTH', cap: 100, used: 90, windowStart: '2026-10-01', windowEnd: '2026-10-31', cycleFallback: false },
    },
    { ruleId: 'r2', name: 'Fuel', stacking: 'EXCLUSIVE', accrualType: 'SLAB', activeInRange: true, matchedCount: 0, basisMatched: 0, earned: 0, earnedUnit: 'POINTS' },
  ],
  milestones: [
    milestone,
    { ...milestone, milestoneId: 'm2', name: 'Fee waiver', achieved: true, payoutType: 'INFO_TRACKER', payoutValue: null, payoutDate: '2026-09-30', windowType: 'ONE_TIME', windowStart: '2026-07-01', windowEnd: '2026-09-30' },
  ],
  cycleFallback: true,
  anniversaryFallback: false,
  perCardAttributionIncomplete: 2,
  byCard: [
    { cardId: 'h1', cardLabel: 'Arjun', unattributed: false, basisSpend: 800, cashbackInr: 0, points: 888, txnCount: 19 },
    { cardId: null, cardLabel: 'x', unattributed: true, basisSpend: 100, cashbackInr: 0, points: 124, txnCount: 2 },
  ],
};
const line: RewardLine = {
  transactionId: 't1',
  transactionDate: '2026-10-02',
  effectiveDate: '2026-10-03',
  description: 'Uber',
  sourcedDescription: 'UBER INDIA 4455',
  mcc: '4121',
  amount: 400,
  basis: 352,
  ruleId: 'r1',
  ruleName: '5X',
  earned: 8,
  earnedUnit: 'POINTS',
  reason: 'MATCHED',
};
const tabData = (over: Partial<RewardsTabData> = {}): RewardsTabData => ({
  window: { from: '2026-03-15', to: '2027-03-14', calendarYear: false },
  report,
  rules: [rule, { ...rule, id: 'r2', name: 'Fuel', priority: 2 }],
  lines: { content: [line], totalElements: 1, totalPages: 1, size: 25, number: 0, first: true, last: true, empty: false },
  query: { page: 0, size: 25 },
  ...over,
});

describe('/ds/rewards/cards/[accountId]', () => {
  beforeEach(() => {
    push.mockReset();
    loadAccount.mockReset().mockResolvedValue(card);
    loadData.mockReset().mockResolvedValue(tabData());
  });

  const renderCard = async (searchParams = {}) =>
    renderWithQuery(await CardPage({ params: Promise.resolve({ accountId: 'c1' }), searchParams: Promise.resolve(searchParams) }));

  it('is the card’s rewards body under its own top bar, back to Rewards, on its own address', async () => {
    await renderCard({ period: 'LAST_MONTH' });
    expect(loadData.mock.calls[0][2]).toEqual({ period: 'LAST_MONTH' });
    expect(screen.getAllByText('HDFC Regalia').length).toBeGreaterThan(0);
    expect(screen.getByText('Earning lines')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '5X' }));
    expect(push).toHaveBeenCalledWith('/ds/rewards/cards/c1?rule=r1');
  });

  it('is not found for a broker or a missing account', async () => {
    loadAccount.mockResolvedValue(broker);
    await expect(renderCard()).rejects.toBeInstanceOf(NotFoundSignal);
    loadAccount.mockResolvedValue(null);
    await expect(renderCard()).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it('chooses a period: any preset resets the page, Custom starts from the dates on screen', async () => {
    loadData.mockResolvedValue(tabData({ query: { page: 2, size: 25, ruleId: 'r1' } }));
    await renderCard();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Last month' }));
    expect(push).toHaveBeenLastCalledWith('/ds/rewards/cards/c1?rule=r1&period=LAST_MONTH');
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Custom range' }));
    expect(push).toHaveBeenLastCalledWith('/ds/rewards/cards/c1?rule=r1&period=CUSTOM&from=2026-03-15&to=2027-03-14');
  });

  it('shows the two date fields for a custom period, and the preset it is on', async () => {
    loadData.mockResolvedValue(
      tabData({ query: { page: 0, size: 25, period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, window: { from: '2026-05-01', to: '2026-06-30', calendarYear: false } }),
    );
    await renderCard();
    expect(screen.getByRole('combobox').textContent).toContain('Custom range');
    expect(screen.getByText('From')).toBeDefined();
    expect(screen.getByText('To')).toBeDefined();
    expect(screen.getByText('1 line · custom range')).toBeDefined();
  });

  it('changes a custom end through its date field, back to the first page', async () => {
    loadData.mockResolvedValue(
      tabData({ query: { page: 3, size: 25, period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, window: { from: '2026-05-01', to: '2026-06-30', calendarYear: false } }),
    );
    await renderCard();
    const from = screen.getByLabelText('From');
    fireEvent.change(from, { target: { value: '10/05/2026' } });
    fireEvent.blur(from);
    expect(push).toHaveBeenLastCalledWith('/ds/rewards/cards/c1?period=CUSTOM&from=2026-05-10&to=2026-06-30');
  });

  it('shows the amber notes, with Manage cards opening the account’s Cards tab', async () => {
    await renderCard();
    expect(screen.getByText(/statement-cycle caps fell back to calendar months/)).toBeDefined();
    expect(screen.getByText(/2 transactions on this multi-card account are unattributed/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Manage cards' }));
    expect(push).toHaveBeenCalledWith('/ds/accounts/c1/cards');
  });

  it('opens a line’s computation in a dialog and closes it', async () => {
    await renderCard();
    fireEvent.click(screen.getByText('Uber'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Reward calculation')).toBeDefined();
    expect(within(dialog).getByText('UBER INDIA 4455')).toBeDefined();
    expect(within(dialog).getByText('Eligible after refunds')).toBeDefined();
    expect(within(dialog).getByText('Earned in full under the matched rule.')).toBeDefined();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists the finished milestones under Completed, with the credited day', async () => {
    await renderCard();
    expect(screen.getByText('Completed · 1')).toBeDefined();
    expect(screen.getByText('Fee waiver')).toBeDefined();
    expect(screen.getByText('One-time · 1 Jul → 30 Sep · credited 30 Sep')).toBeDefined();
    expect(screen.getAllByText('Annual spend')).toHaveLength(1);
  });

  it('shows no open card for a periodic milestone whose current window is achieved, even if an older window was missed', async () => {
    const monthly = { ...milestone, milestoneId: 'm5', name: 'Monthly spend', windowType: 'CALENDAR_MONTH' as const };
    loadData.mockResolvedValue(
      tabData({
        report: {
          ...report,
          milestones: [
            { ...monthly, windowStart: '2026-08-01', windowEnd: '2026-08-31', achieved: false },
            { ...monthly, windowStart: '2026-10-01', windowEnd: '2026-10-31', achieved: true, payoutDate: '2026-10-09', payoutValue: 500, rewardType: 'CASH' },
          ],
        },
      }),
    );
    await renderCard();
    expect(screen.getByText('Completed · 1')).toBeDefined();
    expect(screen.getAllByText('Monthly spend')).toHaveLength(1);
    expect(screen.queryByText('Behind')).toBeNull();
  });

  it('keeps the period control when the report failed, so a bad range can be changed', async () => {
    loadData.mockResolvedValue(tabData({ report: null, query: { page: 0, size: 25, period: 'CUSTOM' } }));
    await renderCard();
    expect(screen.getByText('Could not load rewards')).toBeDefined();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'This month' }));
    expect(push).toHaveBeenLastCalledWith('/ds/rewards/cards/c1?period=THIS_MONTH');
  });

  it('draws a cap bar on the rule, and a plain note on one that earned nothing', async () => {
    await renderCard();
    expect(screen.getByText('90 of 100 pts · resets 31 Oct')).toBeDefined();
    expect(screen.getByText('Fuel earned nothing this period')).toBeDefined();
    expect(screen.queryByText('5X earned nothing this period')).toBeNull();
  });

  it('splits by cardholder with Unattributed, and no assign link', async () => {
    await renderCard();
    expect(screen.getByText('By cardholder')).toBeDefined();
    expect(screen.getByText('Arjun')).toBeDefined();
    expect(screen.getByText('Unattributed')).toBeDefined();
    expect(screen.queryByText(/assign/i)).toBeNull();
  });

  it('shows rupees plus points and links Set point value and Manage to the rules of this card', async () => {
    loadData.mockResolvedValue(tabData({ report: { ...report, summary: { ...report.summary, cashbackInr: 300, grossValueInr: 300 } } }));
    await renderCard();
    expect(screen.getByText('₹300 + 2,180 pts')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Set point value' }).getAttribute('href')).toBe('/ds/rewards/rules?account=c1');
    expect(screen.getByText('Manage').closest('a')?.getAttribute('href')).toBe('/ds/rewards/rules?account=c1');
  });
});
