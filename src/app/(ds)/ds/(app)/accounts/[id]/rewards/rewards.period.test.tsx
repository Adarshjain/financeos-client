import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardsTabData } from '@/features/accounts/detail/rewards/rewardsData';
import type { Account } from '@/lib/account.types';
import type { RewardReport } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import DsAccountRewardsPage from './page';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const card: Account = { id: 'c1', type: AccountType.CREDIT_CARD, name: 'HDFC Regalia', last4: '7741', creditLimit: 1, effectiveCreditLimit: 1, balance: 0, ingestFromDate: '2026-01-01' };
vi.mock('@/features/accounts/detail/accountData', () => ({ loadAccount: async () => card }));

const loadData = vi.fn<() => Promise<RewardsTabData>>();
vi.mock('@/features/accounts/detail/rewards/rewardsData', () => ({ loadRewardsTabData: () => loadData() }));
vi.mock('@/lib/date-range', async (orig) => ({ ...(await orig<typeof import('@/lib/date-range')>()), todayInAppZone: () => '2026-10-13' }));

const report: RewardReport = {
  summary: { basisSpend: 1, transactionCount: 1, matchedCount: 1, cashbackInr: 5, points: 0, milestonesInr: 0, milestonesPts: 0, grossValueInr: 5, discounts: 0, fees: 0, effectiveValueInr: 5 },
  rules: [{ ruleId: 'r1', name: 'Base', stacking: 'EXCLUSIVE', accrualType: 'PERCENT', activeInRange: true, matchedCount: 1, basisMatched: 1, earned: 5, earnedUnit: 'RUPEES' }],
  milestones: [],
  cycleFallback: false,
  anniversaryFallback: false,
};

describe('Accounts → card → Rewards period', () => {
  beforeEach(() => {
    push.mockReset();
    loadData.mockReset().mockResolvedValue({
      window: { from: '2026-03-15', to: '2027-03-14', calendarYear: false },
      report,
      rules: [],
      lines: null,
      query: { page: 0, size: 10 },
    });
  });

  it('has the period select, and a change goes to the account’s own tab', async () => {
    render(await DsAccountRewardsPage({ params: Promise.resolve({ id: 'c1' }) }));
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'This FY' }));
    expect(push).toHaveBeenCalledWith('/ds/accounts/c1/rewards?period=THIS_FY');
  });
});
