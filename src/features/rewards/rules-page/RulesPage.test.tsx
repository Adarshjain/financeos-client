import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '@/lib/types';

import { RulesPage } from './RulesPage';
import type { RulesUsage } from './rulesPageModel';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/ds/rewards/rules',
}));
vi.mock('@/features/accounts/form/ds/AccountFormDialog', () => ({
  AccountFormDialog: ({ account }: { account: { name: string } }) => <div>Edit account dialog for {account.name}</div>,
}));

const accounts = [
  { id: 'a1', name: 'HDFC Regalia Gold', type: AccountType.CREDIT_CARD, anniversaryDate: '2024-03-15', cardholders: [] },
  { id: 'a2', name: 'Amex Platinum', type: AccountType.CREDIT_CARD, anniversaryDate: null, cardholders: [] },
];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts }) }));
vi.mock('@/lib/query/hooks/useCategories', () => ({ useCategories: () => ({ data: [] }) }));

let config: { defaultRewardType: string; pointValueInr: number | null } = { defaultRewardType: 'POINTS', pointValueInr: 0.5 };
const updateConfig = vi.fn();
vi.mock('../queries/useRewardAccountConfigQueries', () => ({
  useRewardAccountConfig: () => ({ data: config }),
  useUpdateRewardAccountConfig: () => ({ mutate: updateConfig, isPending: false }),
}));
const rules = [
  { id: 'r1', name: 'Base', priority: 1, stacking: 'EXCLUSIVE', accrualType: 'SLAB', rewardType: 'POINTS', slabSize: 150, pointsPerSlab: 4, mccs: [], categories: [], feeTreatment: 'EXCLUDE_FEE' },
];
vi.mock('../queries/useRewardRulesQueries', () => ({
  useRewardRules: () => ({ data: rules }),
  useCreateRewardRule: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateRewardRule: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRewardRule: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderRewardRules: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../queries/useRewardCapBucketsQueries', () => ({
  useRewardCapBuckets: () => ({
    data: [
      { id: 'c1', accountId: 'a1', name: 'Dining cap', cap: 5000, rewardType: 'POINTS', windowType: 'CALENDAR_MONTH', counterScope: 'ACCOUNT', ruleCount: 1, createdAt: '', updatedAt: '' },
    ],
  }),
  useCreateRewardCapBucket: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateRewardCapBucket: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRewardCapBucket: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../queries/useRewardMilestonesQueries', () => ({
  useRewardMilestones: () => ({
    data: [
      {
        id: 'm1', accountId: 'a1', name: 'Spend ₹4L', windowType: 'ANNIVERSARY_YEAR', basis: 'SPEND', threshold: 400000, payoutType: 'CASH_VALUE',
        rewardType: 'POINTS', payoutValue: 10000, payoutTiming: 'WINDOW_END', includeCategoryIds: [], includeMccs: [], excludeCategoryIds: [], excludeMccs: [],
        createdAt: '', updatedAt: '',
      },
    ],
  }),
  useCreateRewardMilestone: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateRewardMilestone: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRewardMilestone: () => ({ mutate: vi.fn(), isPending: false }),
}));

const usage: RulesUsage = {
  earned: { r1: { text: '2,180 pts', zero: false } },
  caps: { c1: { pct: 25, tone: 'brand', label: '1,250 / 5,000 · resets 1 Nov' } },
  milestones: { m1: { pct: 21, label: '21% · 152 d left', range: '15 Mar → 14 Mar' } },
};

beforeEach(() => {
  vi.clearAllMocks();
  config = { defaultRewardType: 'POINTS', pointValueInr: 0.5 };
});

describe('RulesPage', () => {
  it('shows the sections in the board’s order', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    const titles = ['How HDFC Regalia Gold earns', 'Caps', 'Milestones', 'Card settings'].map((t) => screen.getByText(t));
    titles.slice(1).forEach((el, i) => {
      expect(titles[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('switches card through the address, so the server loads the new card once', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Card/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Amex Platinum' }));
    expect(replace).toHaveBeenCalledWith('/ds/rewards/rules?account=a2');
  });

  it('does not navigate when the same card is picked again', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Card/ }));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Regalia Gold' }));
    expect(replace).not.toHaveBeenCalled();
  });

  it('draws the usage bars on the cap and milestone rows', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    expect(screen.getByText('1,250 / 5,000 · resets 1 Nov')).toBeInTheDocument();
    expect(screen.getByText('21% · 152 d left')).toBeInTheDocument();
    expect(screen.getByText(/15 Mar → 14 Mar · paid at window end/)).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('draws no bars when the report could not load', () => {
    render(<RulesPage accountId="a1" usage={null} today="2026-10-24" />);
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    expect(screen.getByText('Spend ₹4L')).toBeInTheDocument();
  });
});

describe('Card settings', () => {
  const card = () => screen.getByText('Card settings').closest('div[class*="border"]') as HTMLElement;

  it('shows reward type, point value, the read-only anniversary and the per-rule facts', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    const settings = card();
    expect(within(settings).getByText('Points')).toBeInTheDocument();
    expect(within(settings).getByText('₹0.5/pt')).toBeInTheDocument();
    expect(within(settings).getByText('15 Mar 2024')).toBeInTheDocument();
    expect(within(settings).getByText('Excluded')).toBeInTheDocument();
    expect(within(settings).getByText('No · account-wide')).toBeInTheDocument();
  });

  it('says so when the anniversary and point value are not set', () => {
    config = { defaultRewardType: 'CASH', pointValueInr: null };
    render(<RulesPage accountId="a2" usage={null} today="2026-10-24" />);
    expect(within(card()).getByText('Not set')).toBeInTheDocument();
    expect(within(card()).getByText('Default (₹0.25/pt)')).toBeInTheDocument();
  });

  it('opens the account’s own edit from Edit card', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
    expect(screen.getByText('Edit account dialog for HDFC Regalia Gold')).toBeInTheDocument();
  });

  it('saves reward type and point value together, from the dialog, not as you type', () => {
    updateConfig.mockImplementation((_b: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    fireEvent.click(within(card()).getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('combobox', { name: /^Rewards paid as/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Cash ₹' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Point value/ }), { target: { value: '0.75' } });
    expect(updateConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(updateConfig).toHaveBeenCalledWith(
      { accountId: 'a1', defaultRewardType: 'CASH', pointValueInr: 0.75 },
      expect.anything(),
    );
    expect(toast).toHaveBeenCalledWith('Card settings saved');
  });

  it('refuses a point value of zero', () => {
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    fireEvent.click(within(card()).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Point value/ }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(toast).toHaveBeenCalledWith('Point value must be greater than ₹0', { tone: 'danger' });
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('clears the point value back to the default', () => {
    updateConfig.mockImplementation((_b: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<RulesPage accountId="a1" usage={usage} today="2026-10-24" />);
    fireEvent.click(within(card()).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Point value/ }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(updateConfig).toHaveBeenCalledWith({ accountId: 'a1', defaultRewardType: 'POINTS', pointValueInr: null }, expect.anything());
    expect(toast).toHaveBeenCalledWith('Point value reset to default (₹0.25/pt)');
  });
});
