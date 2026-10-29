import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import type { RewardsOverviewData } from '@/features/rewards/overview/overviewData';
import type { Account } from '@/lib/account.types';
import type { MilestoneStatus, RewardLine, RewardReport, RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import Layout from './(tabs)/layout';
import OverviewPage from './(tabs)/page';
import CardPage from './cards/[id]/page';

// Ranges drop the year of the current one, so the clock is fixed.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-13T06:00:00Z'));
});
afterAll(() => vi.useRealTimers());

class NotFoundSignal extends Error {}
const push = vi.fn();
const refresh = vi.fn();
let pathname = '/rewards';
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundSignal('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push, refresh }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/rewards/rules-page/rules/RuleDialog', () => ({
  RuleDialog: ({ rule, onClose }: { rule?: { name: string }; onClose: () => void }) => (
    <div role="dialog" aria-label="Edit rule">
      <span>{`Editing ${rule?.name ?? 'new'}`}</span>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: [] }) }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('@/features/rewards/queries/useRewardCapBucketsQueries', () => ({ useRewardCapBuckets: () => ({ data: [] }) }));
vi.mock('@/features/rewards/queries/useRewardAccountConfigQueries', () => ({
  useRewardAccountConfig: () => ({ data: { defaultRewardType: 'POINTS' } }),
}));
vi.mock('@/features/rewards/queries/useRewardRulesQueries', () => ({
  useDeleteRewardRule: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateRewardRule: () => ({ mutate: vi.fn(), isPending: false }),
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
    { id: 'a', name: 'HDFC Regalia', bankId: 'hdfc', identity: 'HDFC Bank · ••7741', capLeft: '₹100 left of ₹500 · Dining', nextMilestone: 'Met · Oct', year: 'Anniversary year 15 Mar 26 – 14 Mar 27', subtitle: 'HDFC Bank · ••7741 · Anniversary year 15 Mar 26 – 14 Mar 27', earned: '₹1,090', needsPointValue: false, href: '/rewards/cards/a', setValueHref: '/rewards/rules?account=a' },
    { id: 'b', name: 'Amex Platinum', bankId: null, identity: '••1005', capLeft: '—', nextMilestone: '₹1.2L to go · Annual spend', year: 'Calendar year 1 Jan – 31 Dec', subtitle: '••1005 · Calendar year 1 Jan – 31 Dec', earned: '₹412 + 1,040 pts', needsPointValue: true, href: '/rewards/cards/b', setValueHref: '/rewards/rules?account=b' },
  ],
};

describe('/rewards', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    pathname = '/rewards';
    loadOverview.mockReset().mockResolvedValue({ model });
  });

  const renderOverview = async () => renderWithQuery(<Layout>{await OverviewPage()}</Layout>);

  it('shows the three tabs, Overview open, pointing at their routes', async () => {
    await renderOverview();
    const tabs = ['Overview', 'Earning rules', 'Which card?'].map((n) => screen.getByRole('tab', { name: n }));
    expect(tabs.map((t) => t.getAttribute('href'))).toEqual(['/rewards', '/rewards/rules', '/rewards/which-card']);
  });

  it('opens the tab of the address', async () => {
    pathname = '/rewards/rules';
    await renderOverview();
    expect(screen.getByRole('tab', { name: 'Earning rules' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('false');
  });

  it('shows the all-cards total and one row per card, with no tiles', async () => {
    await renderOverview();
    expect(screen.getByText('Earned this year')).toBeDefined();
    expect(screen.getByText('₹1,502 + 1,040 pts')).toBeDefined();
    expect(screen.queryByText('Each card over its own reward year')).toBeNull();
    expect(screen.getByText('HDFC Regalia')).toBeDefined();
    expect(screen.getAllByText('HDFC Bank · ••7741 · Anniversary year 15 Mar 26 – 14 Mar 27').length).toBeGreaterThan(0);
    expect(screen.getByText('15 Mar 26 – 14 Mar 27')).toBeDefined();
    expect(screen.getByText('Anniversary year')).toBeDefined();
    expect(screen.getByText('₹1,090')).toBeDefined();
    expect(screen.getByText('₹412 + 1,040 pts')).toBeDefined();
    expect(screen.queryByText('Eligible spend')).toBeNull();
  });

  it('lists the cards in a table: Card, Reward year, Cap left, Next milestone and Earned', async () => {
    await renderOverview();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Card', 'Reward year', 'Cap left', 'Next milestone', 'Earned']);
    expect(screen.getByText('HDFC Bank · ••7741')).toBeDefined();
    expect(screen.getByText('₹100 left of ₹500')).toBeDefined();
    expect(screen.getByText('Dining')).toBeDefined();
    expect(screen.getByText('₹1.2L to go')).toBeDefined();
    expect(screen.getByText('Annual spend')).toBeDefined();
  });

  it('opens a card’s rewards page when its row is tapped', async () => {
    await renderOverview();
    fireEvent.click(screen.getByText('HDFC Regalia'));
    expect(push).toHaveBeenCalledWith('/rewards/cards/a');
  });

  it('offers Set point value only on a card with unvalued points, without opening the card', async () => {
    await renderOverview();
    const links = screen.getAllByRole('link', { name: 'Set point value' });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/rewards/rules?account=b');
    fireEvent.click(links[0]);
    expect(push).not.toHaveBeenCalled();
  });

  it('says so when there is no card, and offers Retry when the request failed', async () => {
    loadOverview.mockResolvedValue({ model: { total: '₹0', cards: [] } });
    const { unmount } = await renderOverview();
    expect(screen.getByText('No credit cards yet')).toBeDefined();
    unmount();

    loadOverview.mockResolvedValue({ model: null });
    await renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
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

describe('/rewards/cards/[accountId]', () => {
  beforeEach(() => {
    push.mockReset();
    loadAccount.mockReset().mockResolvedValue(card);
    loadData.mockReset().mockResolvedValue(tabData());
  });

  const renderCard = async (searchParams = {}) =>
    renderWithQuery(await CardPage({ params: Promise.resolve({ id: 'c1' }), searchParams: Promise.resolve(searchParams) }));

  it('is the card’s rewards body under its own top bar, back to Rewards, on its own address', async () => {
    await renderCard({ period: 'LAST_MONTH' });
    expect(loadData.mock.calls[0][2]).toEqual({ period: 'LAST_MONTH' });
    expect(screen.getAllByText('HDFC Regalia').length).toBeGreaterThan(0);
    expect(screen.getByText('Transactions')).toBeDefined();
    expect(screen.queryByText('Earning lines')).toBeNull();
  });

  it('filters the transactions by rule from a dropdown chip in the card header, not a chip row', async () => {
    await renderCard();
    expect(screen.queryByRole('button', { name: '5X' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All rules' }));
    fireEvent.click(screen.getByRole('option', { name: '5X' }));
    expect(push).toHaveBeenCalledWith('/rewards/cards/c1?rule=r1');
  });

  it('hides the pager while the lines fit one page', async () => {
    await renderCard();
    expect(screen.queryByRole('button', { name: 'Rows per page' })).toBeNull();
  });

  it('starts the transactions at 25 a page once the lines outgrow one', async () => {
    loadData.mockResolvedValue(
      tabData({
        lines: { content: [line], totalElements: 60, totalPages: 3, size: 25, number: 0, first: true, last: false, empty: false },
        query: { page: 0, size: 25 },
      }),
    );
    await renderCard();
    expect(screen.getAllByRole('button', { name: 'Rows per page' })[0].textContent).toContain('25');
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
    expect(push).toHaveBeenLastCalledWith('/rewards/cards/c1?rule=r1&period=LAST_MONTH');
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Custom range' }));
    expect(push).toHaveBeenLastCalledWith('/rewards/cards/c1?rule=r1&period=CUSTOM&from=2026-03-15&to=2027-03-14');
  });

  it('puts the Custom range From and To fields in two equal columns', async () => {
    loadData.mockResolvedValue(
      tabData({ query: { page: 0, size: 25, period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, window: { from: '2026-05-01', to: '2026-06-30', calendarYear: false } }),
    );
    await renderCard();
    const grid = screen.getByLabelText('From').closest('.grid');
    expect(grid?.className).toContain('grid-cols-2');
    expect(grid?.contains(screen.getByLabelText('To'))).toBe(true);
  });

  it('shows the bank logo with the card name in the top bar', async () => {
    await renderCard();
    expect(within(screen.getByRole('banner')).getByText('HDFC Regalia')).toBeDefined();
    expect(within(screen.getByRole('banner')).getByTestId('bank-missing')).toBeDefined();
  });

  it('titles the milestones section, with the open milestone inside it', async () => {
    await renderCard();
    expect(screen.getByText('Milestones')).toBeDefined();
    expect(screen.getAllByText('Annual spend')).toHaveLength(1);
    expect(screen.getByText(/Spend ₹4L in the year/)).toBeDefined();
  });

  it('opens a rule of this account in the rule dialog in place (Edit, no Delete or Clone), and closes it', async () => {
    await renderCard();
    fireEvent.click(screen.getByRole('button', { name: /^5X/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit rule' });
    expect(within(dialog).getByText('Editing 5X')).toBeDefined();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Edit rule' })).toBeNull();
  });

  it('keeps rule rows plain when the rule list failed to load', async () => {
    loadData.mockResolvedValue(tabData({ rules: null }));
    await renderCard();
    expect(screen.getByText('Rules on this account')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^5X/ })).toBeNull();
  });

  it('shows the two date fields for a custom period, and the preset it is on', async () => {
    loadData.mockResolvedValue(
      tabData({ query: { page: 0, size: 25, period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, window: { from: '2026-05-01', to: '2026-06-30', calendarYear: false } }),
    );
    await renderCard();
    expect(screen.getByRole('combobox').textContent).toContain('Custom range');
    expect(screen.getByText('From')).toBeDefined();
    expect(screen.getByText('To')).toBeDefined();
    expect(screen.getByText('1 line · Custom range')).toBeDefined();
  });

  it('changes a custom end through its date field, back to the first page', async () => {
    loadData.mockResolvedValue(
      tabData({ query: { page: 3, size: 25, period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, window: { from: '2026-05-01', to: '2026-06-30', calendarYear: false } }),
    );
    await renderCard();
    const from = screen.getByLabelText('From');
    fireEvent.change(from, { target: { value: '10/05/2026' } });
    fireEvent.blur(from);
    expect(push).toHaveBeenLastCalledWith('/rewards/cards/c1?period=CUSTOM&from=2026-05-10&to=2026-06-30');
  });

  it('shows the amber notes, with Manage cards opening the account’s Cards tab', async () => {
    await renderCard();
    expect(screen.getByText(/statement-cycle caps fell back to calendar months/)).toBeDefined();
    expect(screen.getByText(/2 transactions on this multi-card account are unattributed/)).toBeDefined();
    expect(screen.getByRole('link', { name: 'Manage cards' })).toHaveAttribute('href', '/accounts/c1/cards');
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
    expect(screen.getByText('One-time · 1 Jul – 30 Sep · credited 30 Sep')).toBeDefined();
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
    expect(screen.getByText("Couldn't load rewards")).toBeDefined();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'This month' }));
    expect(push).toHaveBeenLastCalledWith('/rewards/cards/c1?period=THIS_MONTH');
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
    expect(screen.getByRole('link', { name: 'Set point value' }).getAttribute('href')).toBe('/rewards/rules?account=c1');
    expect(screen.getByText('Manage').closest('a')?.getAttribute('href')).toBe('/rewards/rules?account=c1');
  });
});
