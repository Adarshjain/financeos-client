import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RewardsAddProvider } from '@/features/rewards/overview/RewardsAdd';
import type { RewardCapBucket, RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import { RulesRefreshProvider } from '../rulesRefresh';
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
let capsLoading = false;
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
vi.mock('../../queries/useRewardCapBucketsQueries', () => ({ useRewardCapBuckets: () => ({ data: caps, isLoading: capsLoading }) }));
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
        name: 'HDFC Regalia',
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
const openHeaderAction = async (action: 'Test' | 'Reorder') => {
  await userEvent.setup().click(screen.getByRole('button', { name: action }));
};
// A row press opens a menu at the press point (Edit, Clone, End & clone, Delete).
const pressRow = async (name: string) => {
  fireEvent.click(screen.getByText(name, { exact: false }));
  await screen.findByRole('menuitem', { name: 'Edit' });
};
const pickMenu = async (item: string) => {
  await userEvent.setup().click(await screen.findByRole('menuitem', { name: item }));
};
const openRow = async (name: string) => {
  await pressRow(name);
  await pickMenu('Edit');
  await screen.findByText('Edit rule');
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
  capsLoading = false;
  recommendData = undefined;
  create.mockImplementation(succeed);
  update.mockImplementation(succeed);
  remove.mockImplementation(succeed);
  reorder.mockImplementation(succeed);
});

describe('RulesSection list', () => {
  it('lists the rules in priority order with their earn, scope, stacking and what they earned', () => {
    renderSection({ r1: { text: '0 pts', zero: true }, r2: { text: '2,180 pts', zero: false } });
    expect(screen.getByText('20 pts / ₹150 · 3 MCCs')).toBeInTheDocument();
    expect(screen.getByText('4 pts / ₹150 · everything else')).toBeInTheDocument();
    expect(screen.getAllByText(/^· exclusive/).length).toBe(2);
    expect(screen.getByText('0 pts')).toBeInTheDocument();
    expect(screen.getByText('2,180 pts')).toBeInTheDocument();
    expect(screen.queryByText(/so far/)).toBeNull();
  });

  it('greys an ended rule, says it ended and offers no End & clone for it', async () => {
    rules = [rule({ activeTo: '2025-01-01' })];
    renderSection();
    expect(screen.getAllByText(/ended/).length).toBeGreaterThan(0);
    await pressRow('5X on dining');
    expect(screen.getByRole('menuitem', { name: 'Clone' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'End & clone' })).not.toBeInTheDocument();
  });

  it('suggests a base rule when there are none, and disables Reorder', async () => {
    rules = [];
    renderSection();
    expect(screen.getByText(/Start with a base rule/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled();
  });

  it('is titled Rules, says the order, and keeps no per-row actions', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /^Actions for / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
    expect(screen.getByText('Applied in the order below')).toBeInTheDocument();
    expect(screen.queryByText(/earns$/)).not.toBeInTheDocument();
  });
});

describe('header actions', () => {
  it('has Test and Reorder link actions and no Rule actions menu, both enabled with two rules and a card', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: 'Rule actions' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeEnabled();
  });

  it('disables Reorder with fewer than two rules, and keeps Test enabled', () => {
    rules = [rule()];
    renderSection();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Test' })).toBeEnabled();
  });

  it('disables Test without a card', () => {
    renderSection(undefined, '');
    expect(screen.getByRole('button', { name: 'Test' })).toBeDisabled();
  });
});

describe('the top bar +', () => {
  it('is registered while a card is shown and opens a new rule', async () => {
    renderSection();
    expect(adder).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Add rule' })).not.toBeInTheDocument();
    openNew();
    expect(await screen.findByText('Add rule')).toBeInTheDocument();
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

describe('the row menu', () => {
  it('opens exactly where the row was pressed, with Edit, Clone, End & clone and a red Delete', async () => {
    renderSection();
    await userEvent.setup().pointer({
      keys: '[MouseLeft]',
      target: screen.getByText('5X on dining', { exact: false }),
      coords: { clientX: 120, clientY: 340 },
    });
    await screen.findByRole('menuitem', { name: 'Edit' });
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Edit', 'Clone', 'End & clone', 'Delete']);
    const anchor = document.querySelector('[data-context-anchor]') as HTMLElement;
    expect([anchor.style.left, anchor.style.top]).toEqual(['120px', '340px']);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('Edit opens the dialog filled in, without Clone, End & clone or Delete rule in it', async () => {
    renderSection();
    await openRow('5X on dining');
    expect(await screen.findByText('Edit rule')).toBeInTheDocument();
    expect(textbox('Name')).toHaveValue('5X on dining');
    expect(screen.getByRole('button', { name: 'Save & recompute' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End & clone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete rule' })).not.toBeInTheDocument();
  });

  it('Clone opens a new rule prefilled from it', async () => {
    renderSection();
    await pressRow('5X on dining');
    await pickMenu('Clone');
    await waitFor(() => expect(screen.getByText('Add rule')).toBeInTheDocument());
    expect(textbox('Name')).toHaveValue('5X on dining');
    expect(screen.queryByRole('button', { name: 'Delete rule' })).not.toBeInTheDocument();
  });

  it('a new rule has neither link', async () => {
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    expect(screen.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End & clone' })).not.toBeInTheDocument();
  });

  it('End & clone ends the rule today, then opens its successor', async () => {
    update.mockImplementation((_a: unknown, opts: { onSuccess: (r: RewardRule) => void }) =>
      opts.onSuccess(rule({ activeTo: new Date().toISOString().slice(0, 10) })),
    );
    renderSection();
    await pressRow('5X on dining');
    await pickMenu('End & clone');
    expect(update).toHaveBeenCalledWith(
      { id: 'r1', body: expect.objectContaining({ name: '5X on dining', activeTo: expect.any(String) }) },
      expect.anything(),
    );
    await waitFor(() => expect(screen.getByText('Add rule')).toBeInTheDocument());
  });

  it('Delete confirms with the Legacy words, then removes the rule and says so', async () => {
    renderSection();
    await pressRow('5X on dining');
    await pickMenu('Delete');
    expect(screen.getByText('Delete rule "5X on dining"?')).toBeInTheDocument();
    expect(screen.getByText(/Historical reports will no longer see it/)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(lastButton('Delete rule'));
    expect(remove).toHaveBeenCalledWith('r1', expect.anything());
    expect(toast).toHaveBeenCalledWith('Rule deleted');
  });

  it('Cancel on the delete confirmation keeps the rule', async () => {
    renderSection();
    await pressRow('5X on dining');
    await pickMenu('Delete');
    fireEvent.click(lastButton('Cancel'));
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('refreshing the server figures', () => {
  it('re-reads them after a delete, a reorder and a save, so the so-far amounts follow', async () => {
    renderSection();
    await pressRow('5X on dining');
    await pickMenu('Delete');
    fireEvent.click(lastButton('Delete rule'));
    expect(refresh).toHaveBeenCalledTimes(1);
    await openHeaderAction('Reorder');
    fireEvent.click(await screen.findByRole('button', { name: 'Move up Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('re-reads them after a rule is saved, but not when the dialog is cancelled', async () => {
    renderSection();
    await openRow('5X on dining');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(refresh).not.toHaveBeenCalled();
    await openRow('5X on dining');
    fireEvent.click(await screen.findByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});

describe('reorder', () => {
  it('Save sends the new order of every rule', async () => {
    renderSection();
    await openHeaderAction('Reorder');
    expect(await screen.findByText('Reorder rules')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move up Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }));
    expect(reorder).toHaveBeenCalledWith({ accountId: 'a1', orderedIds: ['r2', 'r1'] }, expect.anything());
    expect(toast).toHaveBeenCalledWith('Rule order saved');
  });

  it('Cancel throws the new order away', async () => {
    renderSection();
    await openHeaderAction('Reorder');
    fireEvent.click(await screen.findByRole('button', { name: 'Move up Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(reorder).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Reorder rules')).not.toBeInTheDocument());
  });

  it('says nothing is sent when the order did not change', async () => {
    renderSection();
    await openHeaderAction('Reorder');
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
    await openHeaderAction('Test');
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
    await openHeaderAction('Test');
    fireEvent.change(await screen.findByRole('textbox', { name: /^Amount/ }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run test' }));
    expect(recommend).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a spend amount above ₹0.')).toBeInTheDocument();
  });
});

describe('rule dialog', () => {
  it('words the tester checkbox International, never Intl', async () => {
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    expect(screen.getAllByText('International').length).toBeGreaterThan(0);
    expect(screen.queryByText('Intl')).not.toBeInTheDocument();
  });

  it('creates a rule: "any of" holds MCCs, everything else goes in its own field', async () => {
    renderSection();
    openNew();
    expect(await screen.findByText('Add rule')).toBeInTheDocument();
    expect(screen.queryByText(/Changes apply to every transaction/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Leave everything empty/)).not.toBeInTheDocument();
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
    await openRow('5X on dining');
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Dining 6X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toEqual({
      id: 'r1',
      body: expect.objectContaining({ name: 'Dining 6X', priority: 2, mccs: ['5812', '5814', '5411'] }),
    });
    expect(toast).toHaveBeenCalledWith('Rule updated');
  });

  it('has no Delete rule action in the dialog footer, only Cancel and Save', async () => {
    renderSection();
    await openRow('5X on dining');
    expect(screen.queryByRole('button', { name: 'Delete rule' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('groups the fields as Legacy does, in Basics, Match, Earn, Limits and a closed Test this rule, with no fold', async () => {
    renderSection();
    openNew();
    await screen.findByRole('textbox', { name: /^Name/ });
    const bands = ['Basics', 'Match', 'Earn', 'Limits', 'Test this rule'].map((t) => screen.getByText(t, { selector: '*' }));
    bands.slice(1).forEach((el, i) => {
      expect(bands[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Advanced options' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test this rule' })).toHaveAttribute('aria-expanded', 'false');
    for (const name of ['Stacking', 'Card scope', 'Counter scope', 'Categories', 'Channels', 'Days of week', 'EMI spends', 'International', 'Convenience fee', 'Rewards paid as', 'Period cap']) {
      expect(screen.getByRole('combobox', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    for (const name of ['Name', 'MCC codes', 'Merchant pattern', 'Min amount', 'Max amount', 'Per-transaction cap']) {
      expect(screen.getByRole('textbox', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox', { name: /^Active from/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Active until/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Cardholder scope/ })).not.toBeInTheDocument();
  });

  it('carries no static explanatory descriptions, only the live card default', async () => {
    caps = [bucket()];
    renderSection();
    openNew();
    await screen.findByRole('textbox', { name: /^Name/ });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tiered rate' }));
    choose('Rewards paid as', 'Reward points');
    choose('Period cap', 'Shared bucket');
    for (const gone of [
      /OR with MCCs/,
      /Most issuers post the surcharge/,
      /Rate steps as matched spend grows/,
      /Tip: a 0-rate exclusive rule/,
      /Points are tracked as points/,
      /Several rules can drain one bucket/,
    ]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/^Card default: /)).toBeInTheDocument();
  });

  it('drops Card scope and Counter scope when the card has no cardholders', async () => {
    renderSection(undefined, 'a2');
    openNew();
    await screen.findByRole('textbox', { name: /^Name/ });
    expect(screen.queryByRole('combobox', { name: /^Card scope/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Counter scope/ })).not.toBeInTheDocument();
  });

  it('builds tiered rates and sends window and steps', async () => {
    renderSection();
    openNew();
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Tiered' } });
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
    expect(within(document.body).getByText('Matches · 2% of ₹1,000')).toBeInTheDocument();
    expect(within(document.body).getByText('₹20')).toBeInTheDocument();
  });
});

const bucket = (over: Partial<RewardCapBucket> = {}): RewardCapBucket =>
  ({
    id: 'c1',
    accountId: 'a1',
    name: 'Dining cap',
    cap: 5000,
    rewardType: 'POINTS',
    windowType: 'CALENDAR_MONTH',
    counterScope: 'ACCOUNT',
    ruleCount: 0,
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as RewardCapBucket;

describe('When cap is hit', () => {
  const fillNewWithOwnCap = () => {
    fireEvent.change(textbox('Name'), { target: { value: 'Capped' } });
    fireEvent.change(textbox('Rate %'), { target: { value: '2' } });
    choose('Period cap', 'This rule’s own cap');
    fireEvent.change(textbox('Cap'), { target: { value: '500' } });
  };

  it('defaults to Stop for a new rule', async () => {
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    fillNewWithOwnCap();
    expect(screen.getByRole('combobox', { name: /^When cap is hit/ })).toHaveTextContent('Stop (earn nothing)');
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(expect.objectContaining({ periodCap: 500, onCapExhausted: 'STOP' }));
  });

  it('keeps the user’s choice through Period cap None, own, None, own', async () => {
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    choose('Period cap', 'This rule’s own cap');
    choose('When cap is hit', 'Fall through to next rule');
    choose('Period cap', 'No period cap');
    choose('Period cap', 'This rule’s own cap');
    expect(screen.getByRole('combobox', { name: /^When cap is hit/ })).toHaveTextContent('Fall through to next rule');
  });

  it('keeps the stored value when editing', async () => {
    rules = [rule({ periodCap: 500, capWindow: 'CALENDAR_MONTH', onCapExhausted: 'FALL_THROUGH' })];
    renderSection();
    await openRow('5X on dining');
    expect(screen.getByRole('combobox', { name: /^When cap is hit/ })).toHaveTextContent('Fall through to next rule');
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).toEqual(expect.objectContaining({ onCapExhausted: 'FALL_THROUGH' }));
  });

  it('keeps the source’s value when cloning', async () => {
    rules = [rule({ periodCap: 500, capWindow: 'CALENDAR_MONTH', onCapExhausted: 'FALL_THROUGH' })];
    renderSection();
    await pressRow('5X on dining');
    await pickMenu('Clone');
    await screen.findByText('Add rule');
    expect(screen.getByRole('combobox', { name: /^When cap is hit/ })).toHaveTextContent('Fall through to next rule');
    fireEvent.click(screen.getByRole('button', { name: 'Save & recompute' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(expect.objectContaining({ onCapExhausted: 'FALL_THROUGH' }));
  });
});

describe('Shared bucket', () => {
  it('is disabled with a pointer to Caps when no bucket has the rule’s reward type', async () => {
    caps = [bucket({ rewardType: 'CASH' })];
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    choose('Period cap', 'Shared bucket');
    expect(screen.getByRole('combobox', { name: /^Shared bucket/ })).toBeDisabled();
    expect(screen.getByText('No points bucket yet. Add one in Caps.')).toBeInTheDocument();
  });

  it('is not disabled and shows no "none yet" helper while the buckets are still loading', async () => {
    capsLoading = true;
    caps = [];
    rules = [rule({ capBucketId: 'c1', periodCap: null })];
    renderSection();
    await openRow('5X on dining');
    expect(screen.getByRole('combobox', { name: /^Shared bucket/ })).not.toBeDisabled();
    expect(screen.queryByText(/bucket yet/)).not.toBeInTheDocument();
  });

  it('is enabled when a bucket of the reward type exists, and words its window in capitals', async () => {
    caps = [bucket()];
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    choose('Period cap', 'Shared bucket');
    const select = screen.getByRole('combobox', { name: /^Shared bucket/ });
    expect(select).not.toBeDisabled();
    fireEvent.click(select);
    expect(screen.getByRole('option', { name: 'Dining cap — 5000 pts · Per calendar month' })).toBeInTheDocument();
  });
});

describe('Test this rule section scroll', () => {
  afterEach(() => vi.useRealTimers());

  it('scrolls the section into view once it has unfolded, and not after it closes again', async () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    vi.useFakeTimers();
    const toggle = screen.getByRole('button', { name: 'Test this rule' });
    fireEvent.click(toggle);
    expect(scroll).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(scroll).toHaveBeenCalledTimes(1);
  });
});

describe('Test this rule result', () => {
  const openTester = async () => {
    renderSection();
    openNew();
    await screen.findByText('Add rule');
    fireEvent.click(screen.getByRole('button', { name: 'Test this rule' }));
  };

  it('asks for an amount before it can say anything', async () => {
    await openTester();
    fireEvent.change(textbox('Amount'), { target: { value: '' } });
    expect(screen.getByText('Enter an amount (and accrual fields) to test.')).toBeInTheDocument();
  });

  it('reads a match as the reward and a verdict', async () => {
    await openTester();
    choose('Rewards paid as', 'Cash ₹');
    fireEvent.change(textbox('Rate %'), { target: { value: '5' } });
    fireEvent.change(textbox('Amount'), { target: { value: '2500' } });
    expect(screen.getByText('₹125')).toBeInTheDocument();
    expect(screen.getByText('Matches · 5% of ₹2,500')).toBeInTheDocument();
  });

  it('reads a miss as nothing earned and the reason', async () => {
    await openTester();
    fireEvent.change(textbox('Min amount'), { target: { value: '5000' } });
    expect(screen.getByText('0 pts')).toBeInTheDocument();
    expect(screen.getByText('No match · Below minimum amount ₹5,000')).toBeInTheDocument();
  });

  it('keeps the day-of-week caveat only when the rule has days', async () => {
    await openTester();
    expect(screen.queryByText(/day-of-week conditions/)).not.toBeInTheDocument();
  });
});
