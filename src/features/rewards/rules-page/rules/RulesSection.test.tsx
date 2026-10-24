import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RewardsAddProvider } from '@/features/rewards/overview/RewardsAdd';
import type { RewardCapBucket, RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import { RulesRefreshProvider } from '../rulesRefresh';
import { RULE_DIALOG_SUBTITLE } from './RuleDialog';
import { RulesSection } from './RulesSection';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-24',
}));

const TODAY = '2026-10-24';
const rule = (over: Partial<RewardRule> = {}): RewardRule =>
  ({
    id: 'r1',
    accountId: 'a1',
    name: '5X on dining',
    priority: 2,
    stacking: 'EXCLUSIVE',
    accrualType: 'SLAB',
    rewardType: 'POINTS',
    slabSize: 150,
    pointsPerSlab: 20,
    pointPrecision: 0,
    mccs: ['5812', '5814', '5411'],
    categories: [],
    channels: [],
    daysOfWeek: [],
    emiTreatment: 'INCLUDE',
    intlTreatment: 'INCLUDE',
    feeTreatment: 'INCLUDE',
    counterScope: 'ACCOUNT',
    activeFrom: '2024-03-15',
    activeTo: null,
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as RewardRule;

let rules: RewardRule[] = [];
let caps: RewardCapBucket[] = [];
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const reorder = vi.fn();
const recommend = vi.fn();
let recommendData: unknown;
vi.mock('../../queries/useRewardRulesQueries', () => ({
  useRewardRules: () => ({ data: rules }),
  useCreateRewardRule: () => ({ mutate: create, isPending: false }),
  useUpdateRewardRule: () => ({ mutate: update, isPending: false }),
  useDeleteRewardRule: () => ({ mutate: remove, isPending: false }),
  useReorderRewardRules: () => ({ mutate: reorder, isPending: false }),
}));
vi.mock('../../queries/useRewardCapBucketsQueries', () => ({ useRewardCapBuckets: () => ({ data: caps }) }));
vi.mock('../../queries/useRewardAccountConfigQueries', () => ({
  useRewardAccountConfig: () => ({ data: { defaultRewardType: 'POINTS' } }),
}));
vi.mock('@/features/rewards/queries/useRewardRecommendMutation', () => ({
  useRecommendCards: () => ({ mutate: recommend, isPending: false, data: recommendData }),
}));
vi.mock('@/lib/query/hooks/useCategories', () => ({
  useCategories: () => ({ data: [{ id: 'k1', name: 'Dining' }, { id: 'k2', name: 'Fuel' }] }),
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      {
        id: 'a1',
        type: AccountType.CREDIT_CARD,
        cardholders: [{ id: 'h1', accountId: 'a1', role: 'PRIMARY', personName: 'Arjun', currentLast4: '4521', cards: [] }],
      },
    ],
  }),
}));

const succeed = (...args: unknown[]) => (args[1] as { onSuccess: (r?: unknown) => void }).onSuccess();
const textbox = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const choose = (label: string, option: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(`^${label}`) }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};
// The top bar's + is the shell's: the section registers what it should run.
let adder: (() => void) | null = null;
const renderSection = (usage?: Record<string, { text: string; zero: boolean }>, accountId = 'a1') =>
  render(
    <RulesRefreshProvider value={refresh}>
      <RewardsAddProvider value={(add) => (adder = add)}>
        <RulesSection accountId={accountId} today={TODAY} usage={usage} />
      </RewardsAddProvider>
    </RulesRefreshProvider>,
  );
const refresh = vi.fn();
const openNew = () => act(() => adder!());
const openMenu = async (row: number, item: string) => {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('button', { name: /^Actions for / })[row]);
  await user.click(await screen.findByRole('menuitem', { name: item }));
};
const lastButton = (name: string) => {
  const all = screen.getAllByRole('button', { name });
  return all[all.length - 1];
};

beforeEach(() => {
  vi.clearAllMocks();
  adder = null;
  rules = [rule(), rule({ id: 'r2', name: 'Base', priority: 1, mccs: [], pointsPerSlab: 4 })];
  caps = [];
  recommendData = undefined;
  create.mockImplementation(succeed);
  update.mockImplementation(succeed);
  remove.mockImplementation(succeed);
  reorder.mockImplementation(succeed);
});

describe('RulesSection list', () => {
  it('lists the rules in priority order with their earn, scope, stacking and what they earned', () => {
    renderSection({ r1: { text: '0 pts', zero: true }, r2: { text: '2,180 pts', zero: false } });
    const rows = screen.getAllByText(/ so far$/);
    expect(rows[0].textContent).toContain('20 pts / ₹150 · 3 MCCs');
    expect(rows[0].textContent).toContain('exclusive');
    expect(rows[0].textContent).toContain('0 pts so far');
    expect(rows[1].textContent).toContain('everything else');
    expect(screen.getByText('2,180 pts')).toBeInTheDocument();
  });

  it('greys an ended rule, says it ended and offers no End & clone for it', async () => {
    rules = [rule({ activeTo: '2025-01-01' })];
    renderSection();
    expect(screen.getAllByText(/ended/).length).toBeGreaterThan(0);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Actions for / }));
    expect(await screen.findByRole('menuitem', { name: 'Clone' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'End & clone' })).not.toBeInTheDocument();
  });

  it('suggests a base rule when there are none, and disables Reorder', () => {
    rules = [];
    renderSection();
    expect(screen.getByText(/Start with a base rule/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled();
  });
});

describe('the top bar +', () => {
  it('is registered while a card is shown and opens a new rule', async () => {
    renderSection();
    expect(adder).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'New rule' })).not.toBeInTheDocument();
    openNew();
    expect(await screen.findByText('New rule')).toBeInTheDocument();
    expect(textbox('Name')).toHaveValue('');
  });

  it('is not registered without a card, and goes when the page leaves', () => {
    const { unmount } = renderSection(undefined, '');
    expect(adder).toBeNull();
    unmount();
    renderSection();
    expect(adder).not.toBeNull();
  });

  it('is withdrawn when the section unmounts', () => {
    const { unmount } = renderSection();
    unmount();
    expect(adder).toBeNull();
  });
});

describe('rule menu', () => {
  it('Edit opens the rule filled in', async () => {
    renderSection();
    await openMenu(0, 'Edit');
    expect(await screen.findByText(RULE_DIALOG_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    expect(textbox('Name')).toHaveValue('5X on dining');
    expect(screen.getByRole('button', { name: 'Save & recompute' })).toBeInTheDocument();
  });

  it('Clone opens a new rule prefilled from it', async () => {
    renderSection();
    await openMenu(0, 'Clone');
    expect(await screen.findByText(RULE_DIALOG_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText('New rule')).toBeInTheDocument();
    expect(textbox('Name')).toHaveValue('5X on dining');
    expect(screen.queryByRole('button', { name: 'Delete rule' })).not.toBeInTheDocument();
  });

  it('End & clone ends the rule today, then opens its successor', async () => {
    update.mockImplementation((_a: unknown, opts: { onSuccess: (r: RewardRule) => void }) =>
      opts.onSuccess(rule({ activeTo: new Date().toISOString().slice(0, 10) })),
    );
    renderSection();
    await openMenu(0, 'End & clone');
    expect(update).toHaveBeenCalledWith(
      { id: 'r1', body: expect.objectContaining({ name: '5X on dining', activeTo: expect.any(String) }) },
      expect.anything(),
    );
    expect(await screen.findByText(RULE_DIALOG_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText('New rule')).toBeInTheDocument();
  });

  it('Delete confirms with the Legacy words, then removes the rule', async () => {
    renderSection();
    await openMenu(0, 'Delete');
    expect(screen.getByText('Delete rule "5X on dining"?')).toBeInTheDocument();
    expect(screen.getByText(/Historical reports will no longer see it/)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(lastButton('Delete rule'));
    expect(remove).toHaveBeenCalledWith('r1', expect.anything());
    expect(toast).toHaveBeenCalledWith('Rule deleted');
  });
});

describe('refreshing the server figures', () => {
  it('re-reads them after a delete, a reorder and a save, so the so-far amounts follow', async () => {
    renderSection();
    await openMenu(0, 'Delete');
    fireEvent.click(lastButton('Delete rule'));
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move up Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('re-reads them after a rule is saved, but not when the dialog is cancelled', async () => {
    renderSection();
    await openMenu(0, 'Edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(refresh).not.toHaveBeenCalled();
    await openMenu(0, 'Edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});

describe('reorder', () => {
  it('Save sends the new order of every rule', async () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    expect(await screen.findByText('Reorder rules')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move up Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }));
    expect(reorder).toHaveBeenCalledWith({ accountId: 'a1', orderedIds: ['r2', 'r1'] }, expect.anything());
    expect(toast).toHaveBeenCalledWith('Rule order saved');
  });

  it('Cancel throws the new order away', async () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move up Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(reorder).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Reorder rules')).not.toBeInTheDocument());
  });

  it('says nothing is sent when the order did not change', async () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save order' }));
    expect(reorder).not.toHaveBeenCalled();
  });
});

describe('test a transaction', () => {
  it('asks the recommender about this card only and shows the rule breakdown', async () => {
    recommendData = {
      input: { amount: 5000 },
      recommendations: [
        {
          accountId: 'a1',
          accountName: 'HDFC Regalia',
          rank: 1,
          totalValueInr: 100,
          guaranteedValueInr: 100,
          milestoneValueInr: 0,
          effectiveRatePct: 2,
          ruleLines: [
            { ruleId: 'r1', ruleName: '5X on dining', stacking: 'EXCLUSIVE', reason: 'MATCHED', earned: 100, earnedUnit: 'RUPEES', earnedValueInr: 100 },
          ],
          milestones: [],
        },
      ],
    };
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Test a transaction' }));
    expect(await screen.findByText('See which rule wins on this card, and what it earns with your real cap usage.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^MCC/ }), { target: { value: '5812' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run test' }));
    expect(recommend).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, mcc: '5812', accountIds: ['a1'], isEmi: false, isIntl: false }),
      expect.anything(),
    );
    expect(screen.getByText('Rule breakdown')).toBeInTheDocument();
    expect(screen.getAllByText(/5X on dining/).length).toBeGreaterThan(0);
  });

  it('asks for a valid amount before calling anything', async () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Test a transaction' }));
    fireEvent.change(await screen.findByRole('textbox', { name: /^Amount/ }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run test' }));
    expect(recommend).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a valid spend amount greater than ₹0')).toBeInTheDocument();
  });
});

describe('rule dialog', () => {
  it('creates a rule: "any of" holds MCCs, everything else goes in its own field', async () => {
    renderSection();
    openNew();
    expect(await screen.findByText(RULE_DIALOG_SUBTITLE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Per slab' }));
    fireEvent.change(textbox('Name'), { target: { value: 'Dining 5X' } });
    fireEvent.change(textbox('Slab size'), { target: { value: '150' } });
    fireEvent.change(textbox('Points per slab'), { target: { value: '20' } });
    fireEvent.change(textbox('MCC codes'), { target: { value: '5812, 5814' } });
    fireEvent.change(textbox('Merchant pattern'), { target: { value: 'swiggy' } });
    choose('Match type', 'Starts with');
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        accountId: 'a1',
        name: 'Dining 5X',
        rewardType: 'POINTS',
        accrualType: 'SLAB',
        slabSize: 150,
        pointsPerSlab: 20,
        mccs: ['5812', '5814'],
        categoryIds: [],
        merchantPattern: 'swiggy',
        merchantMatch: 'STARTS_WITH',
        stacking: 'EXCLUSIVE',
        priority: 3,
      }),
    );
    expect(toast).toHaveBeenCalledWith('Rule created');
  });

  it('validates as Legacy did', async () => {
    renderSection();
    openNew();
    fireEvent.click(await screen.findByRole('button', { name: 'Save & recompute' }));
    expect(toast).toHaveBeenCalledWith('Rule name is required.', { tone: 'danger' });
    fireEvent.change(textbox('Name'), { target: { value: 'X' } });
    fireEvent.change(textbox('MCC codes'), { target: { value: '58' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    expect(toast).toHaveBeenCalledWith('MCC must be a 4-digit code: 58', { tone: 'danger' });
    expect(create).not.toHaveBeenCalled();
  });

  it('saves an edit with the rule’s own priority', async () => {
    renderSection();
    await openMenu(0, 'Edit');
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Dining 6X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toEqual({
      id: 'r1',
      body: expect.objectContaining({ name: 'Dining 6X', priority: 2, mccs: ['5812', '5814', '5411'] }),
    });
    expect(toast).toHaveBeenCalledWith('Rule updated');
  });

  it('deletes from the dialog’s red link after confirming', async () => {
    renderSection();
    await openMenu(0, 'Edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Delete rule' }));
    expect(screen.getByText('Delete rule "5X on dining"?')).toBeInTheDocument();
    fireEvent.click(lastButton('Delete rule'));
    expect(remove).toHaveBeenCalledWith('r1', expect.anything());
  });

  it('keeps the rarer fields in a fold that opens on Advanced options', async () => {
    renderSection();
    openNew();
    await screen.findByRole('textbox', { name: /^Name/ });
    expect(screen.queryByRole('combobox', { name: /^Stacking/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Per-transaction cap/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced options' }));
    expect(screen.getByRole('combobox', { name: /^Stacking/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Cardholder scope/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Counter scope/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Days of week/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^EMI spends/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^International/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Convenience fee/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Min amount/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Per-transaction cap/ })).toBeInTheDocument();
  });

  it('builds tiered rates from the fold and sends window and steps', async () => {
    renderSection();
    openNew();
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Tiered' } });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tiered rate' }));
    expect(screen.getAllByRole('textbox', { name: /^Rate %/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Add tier' }));
    expect(screen.getAllByRole('textbox', { name: /^Rate %/ })).toHaveLength(3);
    const [first, second, third] = screen.getAllByRole('textbox', { name: /^Rate %/ });
    fireEvent.change(first, { target: { value: '1' } });
    fireEvent.change(second, { target: { value: '2' } });
    fireEvent.change(third, { target: { value: '5' } });
    const upTo = screen.getAllByRole('textbox', { name: /up to/ });
    fireEvent.change(upTo[0], { target: { value: '20000' } });
    fireEvent.change(upTo[1], { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        tierWindow: 'CALENDAR_MONTH',
        percentRate: null,
        tiers: [
          { upTo: 20000, rate: 1 },
          { upTo: 50000, rate: 2 },
          { upTo: null, rate: 5 },
        ],
      }),
    );
  });

  it('runs the in-form tester on the rule as typed', async () => {
    renderSection();
    openNew();
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Base' } });
    choose('Rewards paid as', 'Cash ₹');
    fireEvent.change(textbox('Rate %'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test this rule' }));
    expect(within(document.body).getByText(/Matches → /)).toBeInTheDocument();
  });
});
