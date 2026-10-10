import { randomUUID } from 'node:crypto';

import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createBrokerAccount, createCreditCard } from '../fixtures/seed/accounts';
import { generateIsin, resolveInstrument, trade, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { addLending, createLoan } from '../fixtures/seed/loans';
import { createReport, runAdHoc, runSaved } from '../fixtures/seed/reports';
import { createMilestone, createRewardCard, createRewardRule, spend } from '../fixtures/seed/rewards';
import { createTransaction } from '../fixtures/seed/transactions';
import {
  BUILTIN_KEYS,
  builtinCatalog,
  builtinWidget,
  chartValues,
  heatmapDays,
  linkTransactions,
  pivotByRow,
  rawRowsOf,
  resolveBuiltin,
  runBuiltin,
  seedClose,
  SHORTCUTS_DEFAULT,
} from '../fixtures/seed/widgets';
import { expectForeign, expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const ADD_CARD = 'Add a credit card first';
const ADD_ACCOUNT = 'Add an account first';
const ADD_HOLDINGS = 'Add an investment first';
const ADD_LOAN = 'Add a loan first';
const ADD_LENDING = 'Record a lending first';

/** Every built-in's static catalog entry (the registry), key by key. */
const CATALOG: Record<
  string,
  {
    label: string;
    category: string;
    subtitle: string | null;
    requires: string | null;
    view: string | null;
    minW: number;
    kind: 'template' | 'component';
    templateType: string | null;
    datasource: string | null;
    href: string | null;
    description: string;
  }
> = {
  net_worth: {
    label: 'Net worth', category: 'overview', subtitle: 'Assets minus liabilities', requires: null, view: null, minW: 50,
    kind: 'template', templateType: 'KPI', datasource: 'net_worth', href: '/accounts',
    description:
      'Everything you own minus everything you owe, across bank accounts, cards, investments, loans and money lent. Tap the number to see how each account adds up.',
  },
  attention: {
    label: 'Inbox', category: 'overview', subtitle: 'What needs you now', requires: null, view: null, minW: 50,
    kind: 'component', templateType: null, datasource: null, href: '/inbox',
    description:
      'The few things that need you now — bills, EMIs, missing statements, Gmail reconnects and transactions waiting for review — with the action right on the row.',
  },
  upcoming: {
    label: 'Upcoming', category: 'overview', subtitle: 'Due in the next few days', requires: null, view: null, minW: 100,
    kind: 'template', templateType: 'TABLE', datasource: 'obligations', href: '/upcoming',
    description: 'Bills, EMIs, expected statements and lending returns due in the next few days, soonest first.',
  },
  bills_due: {
    label: 'Bills due', category: 'cards_rewards', subtitle: 'Card bills and due dates', requires: null, view: null, minW: 100,
    kind: 'component', templateType: null, datasource: null, href: null,
    description:
      "Each card's bill as it moves from unbilled spend to statement to paid, with Mark paid on the card. Add one per card or one for all.",
  },
  card_utilisation: {
    label: 'Card utilisation', category: 'cards_rewards', subtitle: 'Live limit usage', requires: 'Needs a credit card', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/accounts',
    description:
      "How much of each credit card's limit you're using right now, from live balances. Banks and bureaus watch utilisation above 30%; this flags cards over it.",
  },
  milestone_progress: {
    label: 'Milestone progress', category: 'cards_rewards', subtitle: 'Next spend milestones', requires: 'Needs a credit card',
    view: 'progress_list', minW: 50, kind: 'template', templateType: 'TABLE', datasource: 'reward_milestones', href: '/rewards',
    description:
      "How close each card is to its next spend milestone, how many days are left, and how much you'd need to spend per day to reach it.",
  },
  cap_headroom: {
    label: 'Cap headroom', category: 'cards_rewards', subtitle: 'Reward caps this cycle', requires: 'Needs a credit card',
    view: 'cap_list', minW: 50, kind: 'template', templateType: 'TABLE', datasource: 'reward_caps', href: '/rewards',
    description:
      'Reward caps that are nearly used up this cycle, so you know when to move a category of spend to another card.',
  },
  rewards_earned: {
    label: 'Rewards earned', category: 'cards_rewards', subtitle: 'This financial year', requires: 'Needs a credit card',
    view: 'rewards_fy', minW: 50, kind: 'template', templateType: 'TABLE', datasource: 'reward_earnings', href: '/rewards',
    description:
      "Rewards earned this financial year, in rupees where the card has a point value and in points where it doesn't.",
  },
  spend_heatmap: {
    label: 'Spending calendar', category: 'spending', subtitle: 'Daily spend', requires: 'Needs an account', view: 'heatmap',
    minW: 100, kind: 'template', templateType: 'CHART', datasource: 'transactions', href: '/transactions',
    description:
      'Daily spending as a calendar, darker on heavier days. Tap a day to see its transactions. Transfers between your own accounts are left out.',
  },
  portfolio_snapshot: {
    label: 'Portfolio', category: 'investments', subtitle: 'Value and day change', requires: 'Needs investments', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/investments',
    description:
      'Current value, amount invested, unrealised gain and XIRR across all brokers, plus the change since the last evening price update.',
  },
  top_movers: {
    label: 'Top movers', category: 'investments', subtitle: 'Biggest moves today', requires: 'Needs investments', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/investments',
    description:
      'Your holdings that moved most since the previous evening price update. Mutual fund NAVs update a day late.',
  },
  allocation: {
    label: 'Allocation', category: 'investments', subtitle: 'By asset class', requires: 'Needs investments', view: 'allocation',
    minW: 50, kind: 'template', templateType: 'CHART', datasource: 'positions', href: '/investments',
    description:
      'How your portfolio splits across equity, debt, hybrid, gold and international, at current market value.',
  },
  tax_harvest: {
    label: 'Tax harvesting', category: 'investments', subtitle: 'Gains this FY', requires: 'Needs investments', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/investments',
    description:
      'Capital gains booked this financial year, how much of the ₹1.25L LTCG exemption is left, and which lots are worth selling — or waiting on — to use it. Not tax advice.',
  },
  loan_payoff: {
    label: 'Loan payoff', category: 'loans_lending', subtitle: "What's left to repay", requires: 'Needs a loan', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/loans',
    description:
      "For each loan: what's left, how much principal you've repaid, the expected payoff date and the interest still to pay.",
  },
  lending_balances: {
    label: 'Lending balances', category: 'loans_lending', subtitle: 'Who owes whom', requires: 'Needs a lending entry', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/loans/lendings',
    description: 'Who owes you and whom you owe, biggest first, with Settle up for each person.',
  },
  account_tile: {
    label: 'Account', category: 'overview', subtitle: 'Balance and 30-day trend', requires: 'Needs an account', view: null,
    minW: 25, kind: 'component', templateType: null, datasource: null, href: null,
    description: "One account's balance with a 30-day trend. Add one for each account you watch closely.",
  },
  emergency_fund: {
    label: 'Emergency fund', category: 'overview', subtitle: 'Months of outflow covered', requires: 'Needs an account', view: null,
    minW: 50, kind: 'component', templateType: null, datasource: null, href: '/accounts',
    description:
      'How many months your bank and cash balances would cover at your usual monthly outflow (card bills and EMIs included). Accounts marked excluded are left out.',
  },
  shortcuts: {
    label: 'Shortcuts', category: 'shortcuts', subtitle: null, requires: null, view: null, minW: 25, kind: 'component',
    templateType: null, datasource: null, href: null,
    description:
      'Your own quick links to pages, accounts, reports and actions like Add transaction or Record lending. Pick and reorder them yourself.',
  },
};

/** What a brand-new user cannot use yet, and why. */
const FRESH_REASONS: Record<string, string | null> = {
  net_worth: null,
  attention: null,
  upcoming: null,
  bills_due: null,
  card_utilisation: ADD_CARD,
  milestone_progress: ADD_CARD,
  cap_headroom: ADD_CARD,
  rewards_earned: ADD_CARD,
  spend_heatmap: ADD_ACCOUNT,
  portfolio_snapshot: ADD_HOLDINGS,
  top_movers: ADD_HOLDINGS,
  allocation: ADD_HOLDINGS,
  tax_harvest: ADD_HOLDINGS,
  loan_payoff: ADD_LOAN,
  lending_balances: ADD_LENDING,
  account_tile: ADD_ACCOUNT,
  emergency_fund: ADD_ACCOUNT,
  shortcuts: null,
};

async function reasons(api: ApiClient): Promise<Record<string, string | null>> {
  const catalog = await builtinCatalog(api);
  return Object.fromEntries(Object.entries(catalog).map(([k, b]) => [k, b.unavailableReason ?? null]));
}

/** The built-in's data (throws unless 200). */
async function builtinData(api: ApiClient, key: string, params?: unknown): Promise<unknown> {
  const res = await runBuiltin(api, key, params);
  expectStatus(res, 200);
  return res.data;
}

/** A dashboard save with one widget; returns the status and error code. */
async function saveOne(api: ApiClient, w: ReturnType<typeof builtinWidget>): Promise<{ status: number; code?: string }> {
  const res = await api.POST('/api/v1/dashboards', { body: { name: `v ${uniqueSeedSuffix()}`, widgets: [w] } });
  return { status: res.response.status, code: (res.error as { code?: string } | undefined)?.code };
}

/**
 * Two reward cards with spend today: A 600 (cap 12 → 6 used, 50%; milestones 10k at 6% and 500
 * achieved), B 900 (cap 10 → 9 used, 90%; milestone 5k at 18%). Cash rewards: A 6, B 9.
 */
async function seedRewardCards(api: ApiClient) {
  const a = await createRewardCard(api, { name: `Widget Card A ${uniqueSeedSuffix()}` });
  const b = await createRewardCard(api, { name: `Widget Card B ${uniqueSeedSuffix()}` });
  await createRewardRule(api, a.account.id, { name: 'A capped', percentRate: 1, periodCap: 12, capWindow: 'CALENDAR_MONTH', onCapExhausted: 'STOP' });
  await createRewardRule(api, b.account.id, { name: 'B capped', percentRate: 1, periodCap: 10, capWindow: 'CALENDAR_MONTH', onCapExhausted: 'STOP' });
  await createMilestone(api, a.account.id, { name: 'A 10k', threshold: 10000 });
  await createMilestone(api, a.account.id, { name: 'A 500', threshold: 500 });
  await createMilestone(api, b.account.id, { name: 'B 5k', threshold: 5000 });
  await spend(api, a.account.id, { amount: 600, date: istToday() });
  await spend(api, b.account.id, { amount: 900, date: istToday() });
  return { a: a.account, b: b.account };
}

test.describe('Built-in catalog: entries, params and availability (@api)', () => {
  test('GET /dashboards/builtins lists all 18 entries with category, picker description, subtitle, needs and view', async ({ request }) => {
    const { api } = await newUser(request, 'bw-catalog');
    const res = await api.GET('/api/v1/dashboards/builtins');
    expectStatus(res, 200);
    expect(res.data!.map((b) => b.key)).toEqual([...BUILTIN_KEYS]);

    for (const b of res.data!) {
      const want = CATALOG[b.key];
      expect(b, b.key).toMatchObject({
        label: want.label,
        category: want.category,
        description: want.description,
        minW: want.minW,
        kind: want.kind,
      });
      expect(b.subtitle ?? null, `${b.key} subtitle`).toBe(want.subtitle);
      expect(b.requires ?? null, `${b.key} requires`).toBe(want.requires);
      expect(b.view ?? null, `${b.key} view`).toBe(want.view);
      expect(b.templateType ?? null, `${b.key} templateType`).toBe(want.templateType);
      expect(b.datasource ?? null, `${b.key} datasource`).toBe(want.datasource);
      expect(b.href ?? null, `${b.key} href`).toBe(want.href);
      // Templates carry their definition with the defaults applied; components have none.
      if (want.kind === 'template') {
        expect(b.templateDefinition, b.key).toBeTruthy();
      } else {
        expect(b.templateDefinition ?? null, b.key).toBeNull();
      }
    }

    // Every category the picker shows has at least one built-in.
    expect(new Set(res.data!.map((b) => b.category))).toEqual(
      new Set(['overview', 'cards_rewards', 'spending', 'investments', 'loans_lending', 'shortcuts'])
    );
  });

  test('param specs: refs, int bounds and defaults, the shortcuts string list with its item pattern', async ({ request }) => {
    const { api } = await newUser(request, 'bw-params');
    const byKey = await builtinCatalog(api);
    const param = (key: string, name: string) => byKey[key].params.find((p) => p.name === name)!;

    for (const key of ['bills_due', 'card_utilisation', 'milestone_progress', 'cap_headroom']) {
      expect(byKey[key].params, key).toHaveLength(1);
      expect(param(key, 'accountId'), key).toMatchObject({ type: 'uuid', ref: 'credit_card', required: false });
    }
    expect(byKey.account_tile.params).toHaveLength(1);
    expect(param('account_tile', 'accountId')).toMatchObject({ type: 'uuid', ref: 'account', required: true });
    expect(byKey.loan_payoff.params).toHaveLength(1);
    expect(param('loan_payoff', 'loanId')).toMatchObject({ type: 'uuid', ref: 'loan', required: false });

    expect(param('top_movers', 'n')).toMatchObject({ type: 'int', required: false, defaultValue: 5, min: 3, max: 10, ref: null });
    expect(param('spend_heatmap', 'months')).toMatchObject({ type: 'int', required: false, defaultValue: 6, min: 1, max: 12 });
    // The heatmap's template carries the default six-month window.
    const heatmap = byKey.spend_heatmap.templateDefinition as { filters: Array<{ field: string; operator: string; value?: unknown }> };
    expect(heatmap.filters).toEqual(
      expect.arrayContaining([{ field: 'date', operator: 'last_x_months', value: { amount: 6 } }])
    );

    const items = param('shortcuts', 'items');
    expect(items).toMatchObject({ type: 'string_list', required: false, maxItems: 12, defaultValue: SHORTCUTS_DEFAULT });
    expect(items.itemPattern).toBeTruthy();
    const pattern = new RegExp(items.itemPattern!);
    for (const ok of [...SHORTCUTS_DEFAULT, 'page:/', 'action:record-lending', `account:${randomUUID()}`, `report:${randomUUID()}`, `dashboard:${randomUUID()}`]) {
      expect(pattern.test(ok), ok).toBe(true);
    }
    for (const bad of ['page://evil.example', 'page:https://evil.example', 'javascript:alert(1)', 'action:Add', 'account:not-a-uuid', 'page:/a\\b', 'pages:/x']) {
      expect(pattern.test(bad), bad).toBe(false);
    }

    // Built-ins without params declare none.
    for (const key of ['net_worth', 'attention', 'rewards_earned', 'portfolio_snapshot', 'allocation', 'tax_harvest', 'lending_balances', 'emergency_fund']) {
      expect(byKey[key].params, key).toEqual([]);
    }
  });

  test('unavailableReason: a fresh user is told what to add; each first card, account, holding, loan and lending clears its own', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-availability');
    expect(await reasons(api)).toEqual(FRESH_REASONS);

    await createBankAccount(api, { name: 'Avail Bank' });
    const afterBank = await reasons(api);
    for (const key of ['spend_heatmap', 'account_tile', 'emergency_fund']) expect(afterBank[key], key).toBeNull();
    for (const key of ['card_utilisation', 'milestone_progress', 'cap_headroom', 'rewards_earned']) expect(afterBank[key], key).toBe(ADD_CARD);
    expect(afterBank.tax_harvest).toBe(ADD_HOLDINGS);

    await createCreditCard(api, { name: 'Avail Card' });
    const afterCard = await reasons(api);
    for (const key of ['card_utilisation', 'milestone_progress', 'cap_headroom', 'rewards_earned']) expect(afterCard[key], key).toBeNull();
    for (const key of ['portfolio_snapshot', 'top_movers', 'allocation', 'tax_harvest']) expect(afterCard[key], key).toBe(ADD_HOLDINGS);

    const broker = await createBrokerAccount(api, { name: 'Avail Broker', cashBalance: 0 });
    // A broker alone is not an investment.
    expect((await reasons(api)).portfolio_snapshot).toBe(ADD_HOLDINGS);
    const inst = await resolveInstrument(api, { type: 'stock', name: `Avail Stock ${uniqueSeedSuffix()}`, isin: generateIsin() });
    await trade(api, { brokerAccountId: broker.id, instrumentId: inst.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-5) });
    const afterHolding = await reasons(api);
    for (const key of ['portfolio_snapshot', 'top_movers', 'allocation', 'tax_harvest']) expect(afterHolding[key], key).toBeNull();
    expect(afterHolding.loan_payoff).toBe(ADD_LOAN);
    expect(afterHolding.lending_balances).toBe(ADD_LENDING);

    await createLoan(api, { name: 'Avail Loan' });
    expect((await reasons(api)).loan_payoff).toBeNull();
    await addLending(api, { newCounterpartyName: `Avail Friend ${uniqueSeedSuffix()}`, amount: 500, entryDate: istToday(-2) });

    const all = await reasons(api);
    expect(Object.values(all).every((r) => r === null), JSON.stringify(all)).toBe(true);
  });

  test('availability is per user: another user with everything does not unlock a fresh user', async ({ request }) => {
    const a = await newUser(request, 'bw-avail-a');
    const b = await newUser(request, 'bw-avail-b');
    await createBankAccount(a.api, { name: 'A Bank' });
    await createCreditCard(a.api, { name: 'A Card' });
    await createLoan(a.api, { name: 'A Loan' });
    expect(await reasons(b.api)).toEqual(FRESH_REASONS);
  });

  test('the catalog, data and definition endpoints require a session', async () => {
    await expectUnauthenticated('GET', '/api/v1/dashboards/builtins');
    await expectUnauthenticated('POST', '/api/v1/dashboards/builtins/spend_heatmap/data', {});
    await expectUnauthenticated('POST', '/api/v1/dashboards/builtins/spend_heatmap/definition', {});
  });
});

test.describe('Template built-in data with params (@api)', () => {
  test('milestone_progress: open windows not yet achieved, most progressed first; accountId narrows to one card', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-milestones');
    const { a, b } = await seedRewardCards(api);

    const all = rawRowsOf(await builtinData(api, 'milestone_progress'));
    expect(all.map((r) => r.milestone)).toEqual(['B 5k', 'A 10k']);
    expect(all.map((r) => Number(r.progressPct))).toEqual([18, 6]);
    expect(all.every((r) => String(r.windowStart) <= istToday() && String(r.windowEnd) >= istToday())).toBe(true);

    const onlyA = rawRowsOf(await builtinData(api, 'milestone_progress', { accountId: a.id }));
    expect(onlyA.map((r) => r.milestone)).toEqual(['A 10k']);
    const onlyB = rawRowsOf(await builtinData(api, 'milestone_progress', { accountId: b.id }));
    expect(onlyB.map((r) => r.milestone)).toEqual(['B 5k']);
    expect(rawRowsOf(await builtinData(api, 'milestone_progress', { accountId: randomUUID() }))).toEqual([]);
    expect(rawRowsOf(await builtinData(api, 'milestone_progress', {}))).toHaveLength(2);
  });

  test('cap_headroom: caps of the open window, most used first; accountId narrows to one card', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-caps');
    const { a } = await seedRewardCards(api);

    const all = rawRowsOf(await builtinData(api, 'cap_headroom'));
    expect(all.map((r) => [r.cap, Number(r.used), Number(r.capLimit), Number(r.utilizationPct)])).toEqual([
      ['B capped', 9, 10, 90],
      ['A capped', 6, 12, 50],
    ]);
    const onlyA = rawRowsOf(await builtinData(api, 'cap_headroom', { accountId: a.id }));
    expect(onlyA.map((r) => r.cap)).toEqual(['A capped']);
  });

  test('rewards_earned: one row per card this financial year, rupee value first', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-rewards');
    const { a, b } = await seedRewardCards(api);

    const data = await builtinData(api, 'rewards_earned');
    const rows = pivotByRow(data, 'card');
    expect(Object.keys(rows)).toEqual([b.name, a.name]);
    expect(rows[b.name].valueInr_sum).toBeCloseTo(9, 2);
    expect(rows[b.name].cashInr_sum).toBeCloseTo(9, 2);
    expect(rows[a.name].valueInr_sum).toBeCloseTo(6, 2);

    // Each row is the card's reward_earnings value this FY.
    for (const card of [a, b]) {
      const kpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'reward_earnings',
        definition: {
          measure: 'valueInr',
          aggregation: 'sum',
          filters: [
            { field: 'effectiveDate', operator: 'current_fy' },
            { field: 'card', operator: 'is', value: card.id },
          ],
        },
      } as never)) as unknown as { value: number };
      expect(Number(kpi.value), card.name).toBeCloseTo(rows[card.name].valueInr_sum, 2);
    }
  });

  test('spend_heatmap: daily debits over the last N months, leaving out excluded, credits and transfer legs', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-heatmap');
    const bank = await createBankAccount(api, { name: 'Heat Bank', openingBalance: 100000 });
    const other = await createBankAccount(api, { name: 'Heat Savings', openingBalance: 0 });
    const card = await createCreditCard(api, { name: 'Heat Card' });
    await createTransaction(api, bank.id, { amount: -100, date: istToday(), description: 'Heat today' });
    await createTransaction(api, bank.id, { amount: -250, date: istToday(-10), description: 'Heat ten' });
    await createTransaction(api, bank.id, { amount: -400, date: istToday(-40), description: 'Heat forty' });
    await createTransaction(api, bank.id, { amount: -1234, date: istToday(-200), description: 'Heat old' });
    await createTransaction(api, card.id, { amount: -300, date: istToday(-2), description: 'Heat card' });
    await createTransaction(api, bank.id, { amount: -999, date: istToday(-5), description: 'Heat excluded', isTransactionExcluded: true });
    await createTransaction(api, bank.id, { amount: 5000, date: istToday(), description: 'Heat salary' });
    const out = await createTransaction(api, bank.id, { amount: -700, date: istToday(-3), description: 'Heat transfer out' });
    const inn = await createTransaction(api, other.id, { amount: 700, date: istToday(-3), description: 'Heat transfer in' });
    await linkTransactions(api, 'TRANSFER', out.id, inn.id);

    const byDefault = heatmapDays(await builtinData(api, 'spend_heatmap'));
    expect(byDefault).toEqual({
      [istToday()]: 100,
      [istToday(-2)]: 300,
      [istToday(-10)]: 250,
      [istToday(-40)]: 400,
    });
    expect(heatmapDays(await builtinData(api, 'spend_heatmap', { months: 6 }))).toEqual(byDefault);
    expect(heatmapDays(await builtinData(api, 'spend_heatmap', { months: 1 }))).toEqual({
      [istToday()]: 100,
      [istToday(-2)]: 300,
      [istToday(-10)]: 250,
    });
    expect(heatmapDays(await builtinData(api, 'spend_heatmap', { months: 12 }))).toEqual({ ...byDefault, [istToday(-200)]: 1234 });
  });

  test('allocation: open positions by asset class at current value', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-allocation');
    const broker = await createBrokerAccount(api, { name: 'Alloc Broker', cashBalance: 0 });
    const stock = await resolveInstrument(api, { type: 'stock', name: `Alloc Stock ${uniqueSeedSuffix()}`, isin: generateIsin() });
    const gold = await resolveInstrument(api, { type: 'etf', name: `Alloc GOLD ETF ${uniqueSeedSuffix()}`, isin: generateIsin() });
    const sold = await resolveInstrument(api, { type: 'stock', name: `Alloc Sold ${uniqueSeedSuffix()}`, isin: generateIsin() });
    expect(stock.assetClass).toBe('EQUITY');
    expect(gold.assetClass).toBe('GOLD');
    await trade(api, { brokerAccountId: broker.id, instrumentId: stock.id, type: 'buy', quantity: 10, price: 100, tradeDate: istToday(-20) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: gold.id, type: 'buy', quantity: 5, price: 50, tradeDate: istToday(-20) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: sold.id, type: 'buy', quantity: 2, price: 10, tradeDate: istToday(-20) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: sold.id, type: 'sell', quantity: 2, price: 12, tradeDate: istToday(-10) });
    await seedClose(api, stock.id, 150, istToday());
    await seedClose(api, gold.id, 60, istToday());

    const data = await builtinData(api, 'allocation');
    const values = chartValues(data);
    expect(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== 0))).toEqual({ EQUITY: 1500, GOLD: 300 });
    expect((data as { valueLabels?: Record<string, string> }).valueLabels).toMatchObject({ EQUITY: 'Equity', GOLD: 'Gold' });
  });

  test('params are validated on every template: wrong type, out of range, undeclared and a bad uuid are 400', async ({ request }) => {
    const { api } = await newUser(request, 'bw-template-params');
    const bad: Array<[string, unknown]> = [
      ['spend_heatmap', { months: 0 }],
      ['spend_heatmap', { months: 13 }],
      ['spend_heatmap', { months: '6' }],
      ['spend_heatmap', { months: 2.5 }],
      ['spend_heatmap', { days: 6 }],
      ['milestone_progress', { accountId: 'not-a-uuid' }],
      ['milestone_progress', { accountId: 42 }],
      ['cap_headroom', { accountId: 'not-a-uuid' }],
      ['cap_headroom', { n: 3 }],
      ['rewards_earned', { accountId: randomUUID() }],
      ['allocation', { months: 3 }],
      ['allocation', [1]],
    ];
    for (const [key, params] of bad) {
      const res = await runBuiltin(api, key, params);
      expect(res.response.status, `${key} ${JSON.stringify(params)}`).toBe(400);
      expect(res.error?.code, `${key} ${JSON.stringify(params)}`).toBe('VALIDATION_ERROR');
    }
    // The declared edges are fine.
    expectStatus(await runBuiltin(api, 'spend_heatmap', { months: 1 }), 200);
    expectStatus(await runBuiltin(api, 'spend_heatmap', { months: 12 }), 200);
    expectStatus(await runBuiltin(api, 'allocation', null), 200);
  });

  test('component built-ins have no report data: 400 for each of them, with or without params', async ({ request }) => {
    const { api } = await newUser(request, 'bw-components');
    const components = BUILTIN_KEYS.filter((k) => CATALOG[k].kind === 'component');
    expect(components).toHaveLength(11);
    for (const key of components) {
      const res = await runBuiltin(api, key);
      expect(res.response.status, key).toBe(400);
      expect(res.error?.code, key).toBe('VALIDATION_ERROR');
    }
  });
});

test.describe('Built-in definition: resolve, save as report, same data (@api)', () => {
  test('each template resolves to the definition it runs; saved as a report it returns the same data', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'bw-definition');
    const { a: cardA } = await seedRewardCards(api);
    const bank = await createBankAccount(api, { name: 'Def Bank', openingBalance: 5000 });
    await createTransaction(api, bank.id, { amount: -321, date: istToday(-4), description: 'Def spend' });
    await createLoan(api, { name: 'Def Loan', startDate: istToday(-27), firstEmiDate: istToday(3) });
    const broker = await createBrokerAccount(api, { name: 'Def Broker', cashBalance: 0 });
    const stock = await resolveInstrument(api, { type: 'stock', name: `Def Stock ${uniqueSeedSuffix()}`, isin: generateIsin() });
    await trade(api, { brokerAccountId: broker.id, instrumentId: stock.id, type: 'buy', quantity: 3, price: 100, tradeDate: istToday(-9) });
    await seedClose(api, stock.id, 120, istToday());

    const cases: Array<[string, unknown]> = [
      ['net_worth', undefined],
      ['upcoming', { days: 30 }],
      ['milestone_progress', { accountId: cardA.id }],
      ['cap_headroom', undefined],
      ['rewards_earned', undefined],
      ['spend_heatmap', { months: 3 }],
      ['allocation', undefined],
    ];
    for (const [key, params] of cases) {
      const resolved = await resolveBuiltin(api, key, params);
      expectStatus(resolved, 200);
      const def = resolved.data!;
      expect(def, key).toMatchObject({ key, label: CATALOG[key].label, type: CATALOG[key].templateType, datasource: CATALOG[key].datasource });
      const pinned = key === 'milestone_progress' || key === 'cap_headroom';
      expect(def.windowAsOf ?? null, `${key} windowAsOf`).toBe(pinned ? istToday() : null);

      const report = await createReport(api, {
        name: def.label,
        type: def.type as never,
        datasource: def.datasource,
        definition: def.definition as never,
      });
      expect(report.name).toBe(CATALOG[key].label);
      const saved = await runSaved(api, report.id);
      const builtin = await builtinData(api, key, params);
      expect(saved, `${key}: the saved copy runs to the built-in's data`).toEqual(builtin);
    }
  });

  test('params are applied to the resolved definition: horizons, months and the card filter with today’s window', async ({ request }) => {
    const { api } = await newUser(request, 'bw-definition-params');
    type Def = { filters: Array<{ field: string; operator: string; value?: unknown }> };
    const filtersOf = async (key: string, params?: unknown) => {
      const res = await resolveBuiltin(api, key, params);
      expectStatus(res, 200);
      return (res.data!.definition as Def).filters;
    };

    expect(await filtersOf('upcoming', { days: 45 })).toEqual([{ field: 'dueDate', operator: 'next_x_days', value: { amount: 45 } }]);
    expect(await filtersOf('upcoming')).toEqual([{ field: 'dueDate', operator: 'next_x_days', value: { amount: 14 } }]);
    expect(await filtersOf('spend_heatmap', { months: 9 })).toEqual(
      expect.arrayContaining([{ field: 'date', operator: 'last_x_months', value: { amount: 9 } }])
    );

    const cardId = randomUUID();
    const milestone = await filtersOf('milestone_progress', { accountId: cardId });
    expect(milestone).toEqual(
      expect.arrayContaining([
        { field: 'achieved', operator: 'is', value: 'No' },
        { field: 'windowStart', operator: 'before', value: istToday(1) },
        { field: 'windowEnd', operator: 'after', value: istToday(-1) },
        { field: 'card', operator: 'is', value: cardId },
      ])
    );
    const caps = await filtersOf('cap_headroom');
    expect(caps.some((f) => f.field === 'card')).toBe(false);
    expect(caps).toEqual(
      expect.arrayContaining([
        { field: 'windowStart', operator: 'before', value: istToday(1) },
        { field: 'windowEnd', operator: 'after', value: istToday(-1) },
      ])
    );
    expect(await filtersOf('rewards_earned')).toEqual(expect.arrayContaining([{ field: 'effectiveDate', operator: 'current_fy' }]));
  });

  test('definition refuses components (400), invalid params (400) and unknown keys (404)', async ({ request }) => {
    const { api } = await newUser(request, 'bw-definition-errors');
    for (const key of ['attention', 'bills_due', 'card_utilisation', 'shortcuts', 'account_tile', 'emergency_fund']) {
      const res = await resolveBuiltin(api, key);
      expect(res.response.status, key).toBe(400);
      expect(res.error?.code, key).toBe('VALIDATION_ERROR');
    }
    for (const [key, params] of [
      ['upcoming', { days: 0 }],
      ['spend_heatmap', { months: 13 }],
      ['milestone_progress', { accountId: 'nope' }],
      ['net_worth', { days: 3 }],
    ] as Array<[string, unknown]>) {
      const res = await resolveBuiltin(api, key, params);
      expect(res.response.status, `${key} ${JSON.stringify(params)}`).toBe(400);
    }
    expectStatus(await resolveBuiltin(api, 'no_such_widget'), 404);
  });
});

test.describe('Dashboard save: built-in widget params and widths (@api)', () => {
  test('shortcuts items: page/action/account/report/dashboard ids pass; foreign hosts, schemes and too many items are 400', async ({ request }) => {
    const { api } = await newUser(request, 'bw-save-shortcuts');
    const good = [
      'page:/',
      'page:/transactions/review',
      'page:/reports?tab=all',
      'action:add-transaction',
      'action:record-lending',
      `account:${randomUUID()}`,
      `report:${randomUUID()}`,
      `dashboard:${randomUUID()}`,
    ];
    const ok = await api.POST('/api/v1/dashboards', { body: { name: 'Shortcuts ok', widgets: [builtinWidget('s', 'shortcuts', 25, { items: good })] } });
    expectStatus(ok, 201);
    expect(ok.data!.widgets[0].params).toEqual({ items: good });
    // Absent items: the server default applies when the widget renders; the widget is stored without them.
    expect((await saveOne(api, builtinWidget('s', 'shortcuts', 25))).status).toBe(201);

    const twelve = Array.from({ length: 12 }, () => `account:${randomUUID()}`);
    expect((await saveOne(api, builtinWidget('s', 'shortcuts', 25, { items: twelve }))).status).toBe(201);

    const bad: Array<[string, unknown]> = [
      ['protocol-relative host', { items: ['page://evil.example'] }],
      ['absolute url', { items: ['page:https://evil.example'] }],
      ['javascript scheme', { items: ['javascript:alert(1)'] }],
      ['colon in a page path', { items: ['page:/x:y'] }],
      ['backslash in a page path', { items: ['page:/a\\b'] }],
      ['upper-case action', { items: ['action:Add'] }],
      ['account not a uuid', { items: ['account:123'] }],
      ['unknown kind', { items: ['link:/x'] }],
      ['13 items', { items: [...twelve, `report:${randomUUID()}`] }],
      ['not a list', { items: 'page:/' }],
      ['a non-string item', { items: [5] }],
      ['undeclared param', { items: ['page:/'], extra: 1 }],
    ];
    for (const [label, params] of bad) {
      const res = await saveOne(api, builtinWidget('s', 'shortcuts', 25, params));
      expect(res.status, label).toBe(400);
      expect(res.code, label).toBe('VALIDATION_ERROR');
    }
  });

  test('account_tile needs an accountId uuid; refs must be uuids; int params stay within their bounds', async ({ request }) => {
    const { api } = await newUser(request, 'bw-save-refs');
    const bad: Array<[string, ReturnType<typeof builtinWidget>]> = [
      ['account_tile without params', builtinWidget('w', 'account_tile', 25)],
      ['account_tile with empty params', builtinWidget('w', 'account_tile', 25, {})],
      ['account_tile with a null accountId', builtinWidget('w', 'account_tile', 25, { accountId: null })],
      ['account_tile with a non-uuid', builtinWidget('w', 'account_tile', 25, { accountId: 'savings' })],
      ['card_utilisation with a non-uuid', builtinWidget('w', 'card_utilisation', 50, { accountId: 'x' })],
      ['loan_payoff with a numeric loanId', builtinWidget('w', 'loan_payoff', 50, { loanId: 7 })],
      ['top_movers n below 3', builtinWidget('w', 'top_movers', 50, { n: 2 })],
      ['top_movers n above 10', builtinWidget('w', 'top_movers', 50, { n: 11 })],
      ['spend_heatmap months above 12', builtinWidget('w', 'spend_heatmap', 100, { months: 13 })],
      ['emergency_fund with a param', builtinWidget('w', 'emergency_fund', 50, { months: 6 })],
    ];
    for (const [label, w] of bad) {
      const res = await saveOne(api, w);
      expect(res.status, label).toBe(400);
      expect(res.code, label).toBe('VALIDATION_ERROR');
    }

    const accountId = randomUUID();
    const loanId = randomUUID();
    const created = await api.POST('/api/v1/dashboards', {
      body: {
        name: 'Refs ok',
        widgets: [
          builtinWidget('tile', 'account_tile', 25, { accountId }),
          builtinWidget('util', 'card_utilisation', 50, { accountId }),
          builtinWidget('loan', 'loan_payoff', 50, { loanId }),
          builtinWidget('movers', 'top_movers', 50, { n: 10 }),
          builtinWidget('heat', 'spend_heatmap', 100, { months: 1 }),
        ],
      },
    });
    expectStatus(created, 201);
    const byId = Object.fromEntries(created.data!.widgets.map((w) => [w.id, w]));
    expect(byId.tile.params).toEqual({ accountId });
    expect(byId.loan.params).toEqual({ loanId });
    expect(byId.movers.params).toEqual({ n: 10 });
    expect(byId.tile.builtin).toMatchObject({ key: 'account_tile', category: 'overview', subtitle: 'Balance and 30-day trend', minW: 25 });
    expect(byId.heat.builtin).toMatchObject({ key: 'spend_heatmap', category: 'spending', view: 'heatmap', templateType: 'CHART' });
  });

  test('minimum widths: every new built-in saves at its minimum and is refused one column narrower', async ({ request }) => {
    const { api } = await newUser(request, 'bw-save-minw');
    const accountId = randomUUID();
    for (const key of BUILTIN_KEYS) {
      const { minW } = CATALOG[key];
      const params = key === 'account_tile' ? { accountId } : undefined;
      expect((await saveOne(api, builtinWidget('w', key, minW, params))).status, `${key} at ${minW}`).toBe(201);
      expect((await saveOne(api, builtinWidget('w', key, minW - 1, params))).status, `${key} at ${minW - 1}`).toBe(400);
    }
    // Quarter-width tiles may also be half or full width.
    expect((await saveOne(api, builtinWidget('w', 'shortcuts', 50))).status).toBe(201);
    expect((await saveOne(api, builtinWidget('w', 'account_tile', 100, { accountId }))).status).toBe(201);
  });
});

test.describe('Built-in widgets: tenancy (@api)', () => {
  test("another user's ids in widget params never return their data", async ({ request }) => {
    test.slow();
    const owner = await newUser(request, 'bw-tenant-owner');
    const intruder = await newUser(request, 'bw-tenant-intruder');
    const { a } = await seedRewardCards(owner.api);
    const bank = await createBankAccount(owner.api, { name: 'Owner Bank', openingBalance: 7000 });
    const loan = await createLoan(owner.api, { name: 'Owner Loan' });

    // The owner sees their card's rows; the intruder, passing the same id, sees none.
    expect(rawRowsOf(await builtinData(owner.api, 'milestone_progress', { accountId: a.id }))).toHaveLength(1);
    for (const key of ['milestone_progress', 'cap_headroom']) {
      const rows = rawRowsOf(await builtinData(intruder.api, key, { accountId: a.id }));
      expect(rows, key).toEqual([]);
    }
    expect(Object.keys(pivotByRow(await builtinData(intruder.api, 'rewards_earned'), 'card'))).toEqual([]);

    // A dashboard may store any uuid, but nothing behind a foreign one is served to the intruder.
    const dash = await intruder.api.POST('/api/v1/dashboards', {
      body: {
        name: 'Borrowed ids',
        widgets: [
          builtinWidget('tile', 'account_tile', 25, { accountId: bank.id }),
          builtinWidget('util', 'card_utilisation', 50, { accountId: a.id }, { y: 10 }),
          builtinWidget('loan', 'loan_payoff', 50, { loanId: loan.id }, { y: 20 }),
        ],
      },
    });
    expectStatus(dash, 201);
    // Foreign ids answer like every other cross-tenant read (GET /accounts/{id} is a 400 there).
    await expectForeign(intruder.api, 'GET', `/api/v1/accounts/${bank.id}`);
    await expectForeign(intruder.api, 'GET', `/api/v1/accounts/${bank.id}/balance-series`);
    await expectForeign(intruder.api, 'GET', `/api/v1/report/datasource/net_worth/rows/${bank.id}/breakdown`);
    await expectForeign(intruder.api, 'GET', `/api/v1/loans/${loan.id}`);
    const intruderAccounts = (await intruder.api.GET('/api/v1/accounts')).data ?? [];
    expect(intruderAccounts.map((x) => x.id)).not.toContain(a.id);
  });
});
