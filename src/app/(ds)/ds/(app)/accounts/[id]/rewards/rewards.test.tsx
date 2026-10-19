import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import type { Account } from '@/lib/account.types';
import type { RewardReport, RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import DsAccountRewardsPage from './page';

class NotFoundSignal extends Error {}
const notFound = vi.fn(() => {
  throw new NotFoundSignal('NEXT_NOT_FOUND');
});
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  useRouter: () => ({ push, refresh }),
}));

const loadAccount = vi.fn<(id: string) => Promise<Account | null>>();
vi.mock('@/features/accounts/detail/accountData', () => ({
  loadAccount: (id: string) => loadAccount(id),
}));

const loadData = vi.fn<() => Promise<RewardsTabData>>();
vi.mock('@/features/accounts/detail/rewards/rewardsData', () => ({
  loadRewardsTabData: () => loadData(),
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const card: Account = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  last4: '7741',
  creditLimit: 300000,
  effectiveCreditLimit: 300000,
  balance: -44319,
  ingestFromDate: '2026-01-01',
};
const wallet: Account = { id: 'w1', type: AccountType.GENERIC, name: 'Paytm Wallet', balance: 200 };
const broker: Account = { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300 };

const rule = (over: Partial<RewardRule>): RewardRule => ({
  id: 'r',
  accountId: 'c1',
  name: 'Base',
  priority: 1,
  stacking: 'EXCLUSIVE',
  accrualType: 'SLAB',
  rewardType: 'POINTS',
  slabSize: 150,
  pointsPerSlab: 4,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const report: RewardReport = {
  summary: {
    basisSpend: 83764,
    transactionCount: 30,
    matchedCount: 30,
    cashbackInr: 0,
    points: 2180,
    milestonesInr: 0,
    milestonesPts: 0,
    grossValueInr: 1090,
    discounts: 0,
    fees: 0,
    effectiveValueInr: 1090,
    effectivePct: 1.3,
    pointsValueInr: 1090,
  },
  rules: [
    { ruleId: 'r1', name: '5X', stacking: 'EXCLUSIVE', accrualType: 'SLAB', activeInRange: true, matchedCount: 0, basisMatched: 0, earned: 0, earnedUnit: 'POINTS' },
    { ruleId: 'r2', name: 'Base', stacking: 'EXCLUSIVE', accrualType: 'SLAB', activeInRange: true, matchedCount: 30, basisMatched: 83764, earned: 2180, earnedUnit: 'POINTS' },
  ],
  milestones: [
    {
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
    },
  ],
  cycleFallback: false,
  anniversaryFallback: false,
};

function data(over: Partial<RewardsTabData> = {}): RewardsTabData {
  return {
    window: { from: '2026-03-15', to: '2027-03-14', calendarYear: false },
    report,
    rules: [rule({ id: 'r1', name: '5X', priority: 1, mccs: ['5812'], pointsPerSlab: 20 }), rule({ id: 'r2', name: 'Base', priority: 2 })],
    lines: {
      content: [
        {
          transactionId: 't1',
          transactionDate: '2026-10-02',
          effectiveDate: '2026-10-02',
          description: 'Uber',
          amount: 352,
          basis: 352,
          ruleId: 'r2',
          ruleName: 'Base',
          earned: 8,
          earnedUnit: 'POINTS',
          reason: 'MATCHED',
          cardLabel: 'Meera',
        },
      ],
      totalElements: 30,
      totalPages: 2,
      size: 25,
      number: 0,
      first: true,
      last: false,
      empty: false,
    },
    query: { page: 0, size: 25 },
    ...over,
  };
}

async function renderPage(searchParams = {}) {
  const ui = await DsAccountRewardsPage({ params: Promise.resolve({ id: 'c1' }), searchParams: Promise.resolve(searchParams) });
  return render(ui);
}

describe('/ds/accounts/[id]/rewards', () => {
  beforeEach(() => {
    loadAccount.mockReset().mockResolvedValue(card);
    loadData.mockReset().mockResolvedValue(data());
    notFound.mockClear();
    push.mockReset();
    refresh.mockReset();
  });

  it('renders the tiles, the earning lines, the milestone and the rules', async () => {
    await renderPage();

    expect(screen.getByText('Eligible spend')).toBeDefined();
    expect(screen.getAllByText('₹83,764').length).toBe(2);
    expect(screen.getByText('30 of 30 transactions earned')).toBeDefined();
    expect(screen.getByText('≈ ₹1,090 at ₹0.50 / pt')).toBeDefined();
    expect(screen.getByText('1.3%')).toBeDefined();
    expect(screen.getByText('anniversary year 15 Mar → 14 Mar')).toBeDefined();

    expect(screen.getByText('Earning lines')).toBeDefined();
    expect(screen.getByText('30 lines · this anniversary year')).toBeDefined();
    expect(screen.getAllByText(/Uber/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Earned').length).toBeGreaterThan(0);

    expect(screen.getByText('Spend ₹4L in the year → 10,000 bonus pts')).toBeDefined();
    expect(screen.getByText('Behind')).toBeDefined();
    expect(screen.getByText('Rules on this account')).toBeDefined();
    expect(screen.getByText('First match wins')).toBeDefined();
    expect(screen.getByText('1 · 5X')).toBeDefined();
    expect(screen.getByText('MCC 5812 · 20 pts / ₹150')).toBeDefined();
    expect(screen.getByText('Manage').closest('a')?.getAttribute('href')).toBe('/rewards/rules?account=c1');
  });

  it('sets ?rule= when a rule chip is chosen and clears it on All rules', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '5X' }));
    expect(push).toHaveBeenCalledWith('/ds/accounts/c1/rewards?rule=r1');

    push.mockClear();
    loadData.mockResolvedValue(data({ query: { ruleId: 'r1', page: 1, size: 25 } }));
    await renderPage({ rule: 'r1' });
    fireEvent.click(screen.getAllByRole('button', { name: 'All rules' }).at(-1)!);
    expect(push).toHaveBeenCalledWith('/ds/accounts/c1/rewards');
  });

  it('shows the wallet empty state when no rule covers the account', async () => {
    loadAccount.mockResolvedValue(wallet);
    loadData.mockResolvedValue(data({ report: { ...report, rules: [], milestones: [] }, rules: [], lines: null }));
    await renderPage();

    expect(screen.getByText('No reward rules on Paytm Wallet')).toBeDefined();
    expect(screen.getByText('Rewards earned here show once a rule covers this account.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Add reward rule' }));
    expect(push).toHaveBeenCalledWith('/rewards/rules?account=w1');
  });

  it('shows an error with Try again when the report failed, and keeps the page when only the lines failed', async () => {
    loadData.mockResolvedValue(data({ report: null }));
    const { unmount } = await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();
    unmount();

    loadData.mockResolvedValue(data({ lines: null }));
    await renderPage();
    expect(screen.getByText('Could not load earning lines')).toBeDefined();
    expect(screen.getByText('Eligible spend')).toBeDefined();
  });

  it('is not found for a broker or a missing account', async () => {
    loadAccount.mockResolvedValue(broker);
    await expect(renderPage()).rejects.toBeInstanceOf(NotFoundSignal);
    loadAccount.mockResolvedValue(null);
    await expect(renderPage()).rejects.toBeInstanceOf(NotFoundSignal);
  });
});
