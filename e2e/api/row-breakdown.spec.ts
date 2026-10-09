import { randomUUID } from 'node:crypto';

import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createBrokerAccount, createCreditCard, createGenericAccount } from '../fixtures/seed/accounts';
import { generateIsin, generateYahooSymbol, resolveInstrument, trade, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { addEvent, addLending, createCounterparty, createLoan, getLoan, schedule } from '../fixtures/seed/loans';
import { ingestCardStatement } from '../fixtures/seed/nav';
import { createTransaction } from '../fixtures/seed/transactions';
import {
  breakdownSection,
  chainTotals,
  ddmmyyyy,
  kpiBody,
  rowBreakdown,
  type RowBreakdownResponse,
  sectionOf,
  stepsOf,
  tableOf,
  underlyingAdHoc,
  underlyingBuiltin,
} from '../fixtures/seed/underlying';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/** The net_worth rows as the KPI's underlying data lists them, by name. */
async function netWorthRows(api: ApiClient): Promise<Record<string, { id: string; value: number; side: string }>> {
  const res = await underlyingAdHoc(api, kpiBody('net_worth', { measure: 'value', aggregation: 'sum', filters: [] }), { size: 1000 });
  return Object.fromEntries(
    tableOf(res).rows.map((r) => [String(r.name), { id: String(r.id), value: Number(r.value), side: String(r.side) }])
  );
}

/** The chain closes exactly on the total, with no rounding step. */
function expectReconciles(b: RowBreakdownResponse): void {
  const { running, equals } = chainTotals(b.steps);
  expect(running, 'start ± terms = equals').toBe(equals);
  expect(equals, 'equals = total').toBe(Math.round(Number(b.total) * 100));
  expect(b.steps.map((s) => s.label)).not.toContain('Rounding difference');
}

async function breakdownStatus(api: ApiClient, name: string, rowId: string): Promise<number> {
  const res = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', { params: { path: { name, rowId } } });
  return res.response.status;
}

async function sectionStatus(api: ApiClient, name: string, rowId: string, section: string): Promise<number> {
  const res = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}', {
    params: { path: { name, rowId, section } },
  });
  return res.response.status;
}

test.describe('net_worth row breakdown: accounts (@api)', () => {
  test('a bank account without an anchor statement: opening balance plus credits minus debits over every transaction', async ({ request }) => {
    const { api } = await newUser(request, 'bd-bank');
    const bank = await createBankAccount(api, { name: 'BD Bank', openingBalance: 10000 });
    const refund = await createTransaction(api, bank.id, { amount: 2500, date: istToday(-5), description: 'Refund in' });
    const rent = await createTransaction(api, bank.id, { amount: -1200, date: istToday(-4), description: 'Rent' });
    const groceries = await createTransaction(api, bank.id, {
      amount: -300,
      date: istToday(-3),
      description: 'Groceries',
      isTransactionExcluded: true,
    });

    const row = (await netWorthRows(api))['BD Bank'];
    expect(row).toMatchObject({ id: bank.id, value: 11000, side: 'asset' });

    const b = await rowBreakdown(api, 'net_worth', bank.id);
    expect(b).toMatchObject({
      datasource: 'net_worth',
      rowId: bank.id,
      title: 'BD Bank',
      subtitle: 'Asset',
      kindLabel: 'Bank account',
      total: row.value,
      totalLabel: 'Balance',
      format: 'currency',
      asOf: istToday(),
    });
    expect(stepsOf(b)).toEqual([
      ['start', 'Opening balance', 10000],
      ['add', 'Credits (1)', 2500],
      ['subtract', 'Debits (2)', 1500],
      ['equals', 'Balance', 11000],
    ]);
    expectReconciles(b);
    // The excluded transaction still counts, and the note says so.
    expect(b.notes).toEqual(['Excluded transactions still count towards balances.']);

    const tx = sectionOf(b, 'transactions');
    expect(tx).toMatchObject({ label: 'Transactions', rowAction: 'transaction', rowBreakdownDatasource: null });
    expect(tx.rows.columns.map((c) => [c.key, c.label])).toEqual([
      ['date', 'Date'],
      ['description', 'Description'],
      ['category', 'Category'],
      ['amount', 'Amount'],
      ['excluded', 'Excluded'],
    ]);
    expect(tx.rows.rows).toEqual([
      { id: groceries.id, date: istToday(-3), description: 'Groceries', category: '', amount: -300, excluded: true },
      { id: rent.id, date: istToday(-4), description: 'Rent', category: '', amount: -1200, excluded: false },
      { id: refund.id, date: istToday(-5), description: 'Refund in', category: '', amount: 2500, excluded: false },
    ]);
    expect(tx.rows.page).toEqual({ number: 0, size: 25, totalElements: 3, totalPages: 1 });

    // Section paging: the breakdown carries page 0 of `size`; the section endpoint serves the rest.
    const small = await rowBreakdown(api, 'net_worth', bank.id, 2);
    expect(sectionOf(small, 'transactions').rows.page).toEqual({ number: 0, size: 2, totalElements: 3, totalPages: 2 });
    const page1 = await breakdownSection(api, 'net_worth', bank.id, 'transactions', { page: 1, size: 2 });
    expect(page1.rows.map((r) => r.description)).toEqual(['Refund in']);
    expect(page1.page).toEqual({ number: 1, size: 2, totalElements: 3, totalPages: 2 });
    const middle = await breakdownSection(api, 'net_worth', bank.id, 'transactions', { page: 1, size: 1 });
    expect(middle.rows.map((r) => r.id)).toEqual([rent.id]);
    expect((await breakdownSection(api, 'net_worth', bank.id, 'transactions', { size: 500 })).page.size, 'size is capped at 200').toBe(200);
    expect(sectionOf(await rowBreakdown(api, 'net_worth', bank.id, 500), 'transactions').rows.page.size).toBe(200);
  });

  test('an overdrawn account is a liability and its chain runs in that direction', async ({ request }) => {
    const { api } = await newUser(request, 'bd-overdrawn');
    const bank = await createBankAccount(api, { name: 'BD Overdrawn', openingBalance: 100 });
    await createTransaction(api, bank.id, { amount: -600, date: istToday(-2), description: 'Big spend' });

    const row = (await netWorthRows(api))['BD Overdrawn'];
    expect(row).toMatchObject({ value: 500, side: 'liability' });
    const b = await rowBreakdown(api, 'net_worth', bank.id);
    expect(b).toMatchObject({ subtitle: 'Liability', total: 500, totalLabel: 'Balance' });
    expect(b.notes).toEqual([]);
    // Signed: 100 − 600 = −500, listed as 500 owed: −100 + 600 = 500.
    expect(stepsOf(b)).toEqual([
      ['start', 'Opening balance', -100],
      ['add', 'Debits (1)', 600],
      ['equals', 'Balance', 500],
    ]);
    expectReconciles(b);
  });

  test('a wallet with nothing to start from lists only its movements', async ({ request }) => {
    const { api } = await newUser(request, 'bd-wallet');
    const wallet = await createGenericAccount(api, { name: 'BD Wallet' });
    await createTransaction(api, wallet.id, { amount: 300, date: istToday(-2), description: 'Top-up' });

    const b = await rowBreakdown(api, 'net_worth', wallet.id);
    expect(b).toMatchObject({ kindLabel: 'Account', subtitle: 'Asset', total: 300 });
    expect(stepsOf(b), 'no start step for a non-bank account with a zero base').toEqual([
      ['add', 'Credits (1)', 300],
      ['equals', 'Balance', 300],
    ]);
    expectReconciles(b);
  });

  test('a credit card without an anchor statement: spends minus payments from zero', async ({ request }) => {
    const { api } = await newUser(request, 'bd-card');
    const card = await createCreditCard(api, { name: 'BD Card', last4: '5150' });
    await createTransaction(api, card.id, { amount: -2000, date: istToday(-6), description: 'Laptop' });
    await createTransaction(api, card.id, { amount: -500, date: istToday(-5), description: 'Dinner' });
    const payment = await createTransaction(api, card.id, { amount: 300, date: istToday(-2), description: 'Payment' });

    const row = (await netWorthRows(api))['BD Card'];
    expect(row).toMatchObject({ value: 2200, side: 'liability' });
    const b = await rowBreakdown(api, 'net_worth', card.id);
    expect(b).toMatchObject({ title: 'BD Card', subtitle: 'Liability', kindLabel: 'Credit card', total: 2200, totalLabel: 'Outstanding' });
    expect(stepsOf(b)).toEqual([
      ['start', 'Starting balance', 0],
      ['add', 'Spends (2)', 2500],
      ['subtract', 'Payments and refunds (1)', 300],
      ['equals', 'Outstanding', 2200],
    ]);
    expectReconciles(b);
    const tx = sectionOf(b, 'transactions');
    expect(tx.rows.rows.map((r) => [r.description, r.amount])).toEqual([
      ['Payment', 300],
      ['Dinner', -500],
      ['Laptop', -2000],
    ]);
    expect(tx.rows.rows[0].id).toBe(payment.id);
  });

  test('a credit card with an imported statement starts from what the statement says is owed', async ({ request }) => {
    const { api } = await newUser(request, 'bd-card-anchor');
    const card = await createCreditCard(api, { name: 'BD Anchored Card', last4: '8471' });
    // A statement closing 3 days ago owing 6000 (4500 + 1500, both inside it).
    await ingestCardStatement(api, card.id, '8471');
    const spendAfter = await createTransaction(api, card.id, { amount: -700, date: istToday(-1), description: 'After statement' });
    const paid = await createTransaction(api, card.id, { amount: 1000, date: istToday(), description: 'Card payment' });
    const since = ddmmyyyy(istToday(-3));

    const row = (await netWorthRows(api))['BD Anchored Card'];
    expect(row).toMatchObject({ value: 5700, side: 'liability' });
    const b = await rowBreakdown(api, 'net_worth', card.id);
    expect(b).toMatchObject({ subtitle: 'Liability', kindLabel: 'Credit card', total: 5700, totalLabel: 'Outstanding' });
    expect(stepsOf(b)).toEqual([
      ['start', `Owed on statement ending ${since}`, 6000],
      ['add', `Spends since ${since} (1)`, 700],
      ['subtract', `Payments and refunds since ${since} (1)`, 1000],
      ['equals', 'Outstanding', 5700],
    ]);
    expectReconciles(b);
    expect(b.notes, 'opening balance plus every transaction agrees with the statement').toEqual([]);
    // Only the transactions after the statement are listed (the statement's own lines are in its closing balance).
    const tx = sectionOf(b, 'transactions');
    expect(tx).toMatchObject({ label: `Transactions after ${since}`, rowAction: 'transaction' });
    expect(tx.rows.rows.map((r) => r.id)).toEqual([paid.id, spendAfter.id]);
    expect((await breakdownSection(api, 'net_worth', card.id, 'transactions')).page.totalElements).toBe(2);
  });

  test('a broker: cash plus holdings at market value, each holding opening its positions breakdown', async ({ request }) => {
    const { api } = await newUser(request, 'bd-broker');
    const broker = await createBrokerAccount(api, { name: 'BD Broker', cashBalance: 5000 });
    const symbol = generateYahooSymbol('BDP');
    const priced = await resolveInstrument(api, {
      type: 'stock',
      name: `BD Priced ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });
    const unpriced = await resolveInstrument(api, { type: 'stock', name: `BD Unpriced ${uniqueSeedSuffix()}`, isin: generateIsin() });
    const closedInst = await resolveInstrument(api, { type: 'stock', name: `BD Closed ${uniqueSeedSuffix()}`, isin: generateIsin() });
    const t = (instrumentId: string, type: 'buy' | 'sell', quantity: number, price: number, daysAgo: number) =>
      trade(api, { brokerAccountId: broker.id, instrumentId, type, quantity, price, tradeDate: istToday(-daysAgo) });
    await t(priced.id, 'buy', 10, 100, 60);
    await t(priced.id, 'buy', 5, 120, 45);
    await t(priced.id, 'sell', 3, 150, 30);
    await t(unpriced.id, 'buy', 4, 250, 50);
    await t(closedInst.id, 'buy', 2, 100, 40);
    await t(closedInst.id, 'sell', 2, 110, 20);

    // Priced: 12 open × 999.99 (WireMock Yahoo) = 11999.88; unpriced at cost 4 × 250 = 1000.
    const row = (await netWorthRows(api))['BD Broker'];
    expect(row).toMatchObject({ id: broker.id, value: 17999.88, side: 'asset' });
    const b = await rowBreakdown(api, 'net_worth', broker.id);
    expect(b).toMatchObject({ title: 'BD Broker', kindLabel: 'Broker', subtitle: 'Asset', total: 17999.88, totalLabel: 'Balance' });
    expect(stepsOf(b)).toEqual([
      ['start', 'Cash balance', 5000],
      ['add', 'Holdings at market value (2)', 12999.88],
      ['equals', 'Balance', 17999.88],
    ]);
    expectReconciles(b);

    const holdings = sectionOf(b, 'holdings');
    expect(holdings).toMatchObject({ label: 'Holdings', rowAction: 'breakdown', rowBreakdownDatasource: 'positions' });
    expect(holdings.rows.columns.map((c) => c.key)).toEqual(['instrument', 'quantity', 'price', 'priceDate', 'value', 'valuation']);
    const [pricedRow, unpricedRow] = holdings.rows.rows;
    expect(holdings.rows.rows, 'closed holdings add nothing and are not listed').toHaveLength(2);
    expect(pricedRow).toMatchObject({ instrument: priced.name, quantity: 12, price: 999.99, value: 11999.88, valuation: null });
    expect(unpricedRow).toMatchObject({ instrument: unpriced.name, quantity: 4, price: null, priceDate: null, value: 1000, valuation: 'At cost (no price)' });
    const pricedHolding = String(pricedRow.id);
    const unpricedHolding = String(unpricedRow.id);

    const holdingsPage = await breakdownSection(api, 'net_worth', broker.id, 'holdings', { page: 1, size: 1 });
    expect(holdingsPage.rows.map((r) => r.id)).toEqual([unpricedHolding]);
    expect(holdingsPage.page).toEqual({ number: 1, size: 1, totalElements: 2, totalPages: 2 });

    // The positions breakdown of the priced holding: FIFO lots 7 @ 100 and 5 @ 120 = 1300 invested.
    const p = await rowBreakdown(api, 'positions', pricedHolding);
    expect(p).toMatchObject({
      datasource: 'positions',
      rowId: pricedHolding,
      title: priced.name,
      subtitle: 'BD Broker',
      kindLabel: 'Stock',
      total: 11999.88,
      totalLabel: 'Current value',
    });
    const steps = p.steps.map((s) => [s.op, s.label, s.amount ?? null]);
    expect(steps.slice(0, 5)).toEqual([
      ['info', 'Open quantity', 12],
      ['info', 'Average cost', 108.3333],
      ['start', 'Cost of open lots', 1300],
      ['add', 'Unrealised gain', 10699.88],
      ['equals', 'Current value', 11999.88],
    ]);
    expect(steps.slice(5)).toEqual([
      ['info', 'Latest price', 999.99],
      ['info', 'Realised P&L', 150],
      ['info', 'Dividends', 0],
      ['info', 'Charges', 0],
    ]);
    expect(p.steps[5].detail).toMatch(/^\d{2}\/\d{2}\/\d{4} · Yahoo Finance$/);
    expectReconciles(p);
    expect(sectionOf(p, 'lots').rows.rows).toEqual([
      { id: '0', buyDate: istToday(-60), origin: 'Buy', quantity: 7, costPerUnit: 100, cost: 700 },
      { id: '1', buyDate: istToday(-45), origin: 'Buy', quantity: 5, costPerUnit: 120, cost: 600 },
    ]);
    expect(sectionOf(p, 'lots')).toMatchObject({ label: 'Open lots', rowAction: null });
    expect(sectionOf(p, 'history').rows.rows.map((r) => [r.date, r.event, r.quantityChange, r.price, r.quantityAfter])).toEqual([
      [istToday(-60), 'Buy', 10, 100, 10],
      [istToday(-45), 'Buy', 5, 120, 15],
      [istToday(-30), 'Sell', -3, 150, 12],
    ]);
    const history1 = await breakdownSection(api, 'positions', pricedHolding, 'history', { page: 1, size: 2 });
    expect(history1.rows.map((r) => r.event)).toEqual(['Sell']);

    // Without a price the holding is valued at cost: the chain starts and ends on the cost.
    const u = await rowBreakdown(api, 'positions', unpricedHolding);
    expect(stepsOf(u)).toEqual([
      ['info', 'Open quantity', 4],
      ['info', 'Average cost', 250],
      ['start', 'Cost of open lots', 1000],
      ['equals', 'Current value', 1000],
      ['info', 'No price — valued at cost', null],
      ['info', 'Realised P&L', 0],
      ['info', 'Dividends', 0],
      ['info', 'Charges', 0],
    ]);

    // positions KPI underlying rows open the same breakdowns; a closed holding (no current value) is not listed.
    const vud = await underlyingAdHoc(api, kpiBody('positions', { measure: 'currentValue', aggregation: 'sum', filters: [] }));
    expect(vud).toMatchObject({ datasource: 'positions', rowAction: 'breakdown', value: 12999.88, rowCount: 2 });
    expect(tableOf(vud).columns.map((c) => c.key)).toEqual(['broker', 'instrument', 'currentValue']);
    expect(tableOf(vud).rows.map((r) => r.id).sort()).toEqual([pricedHolding, unpricedHolding].sort());

    // A closed holding is listed under a measure it has, and its breakdown says it is closed.
    const realised = await underlyingAdHoc(
      api,
      kpiBody('positions', { measure: 'realizedGainLoss', aggregation: 'max', filters: [] })
    );
    expect(realised).toMatchObject({ value: 150, winnerOnly: true });
    const closedRows = await underlyingAdHoc(
      api,
      kpiBody('positions', { measure: 'realizedGainLoss', aggregation: 'sum', filters: [{ field: 'instrument', operator: 'is', value: closedInst.name }] })
    );
    const closedHolding = String(tableOf(closedRows).rows[0].id);
    const c = await rowBreakdown(api, 'positions', closedHolding);
    expect(c).toMatchObject({ total: 0, totalLabel: 'Current value' });
    expect(stepsOf(c)).toEqual([
      ['info', 'Position closed', null],
      ['start', 'Cost of open lots', 0],
      ['equals', 'Current value', 0],
      ['info', 'Realised P&L', 20],
      ['info', 'Dividends', 0],
      ['info', 'Charges', 0],
    ]);
    expect(sectionOf(c, 'lots').rows.rows).toEqual([]);
  });
});

test.describe('net_worth row breakdown: loans and lendings (@api)', () => {
  test('a loan: principal minus principal repaid through the EMIs due and the prepayments they reflect', async ({ request }) => {
    const { api } = await newUser(request, 'bd-loan');
    const loan = await createLoan(api, {
      name: 'BD Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate: istToday(-100),
      firstEmiDate: istToday(-70),
    });
    await addEvent(api, loan.id, { eventType: 'prepayment', effectiveDate: istToday(-50), amount: 10000, adjustmentMode: 'reduce_emi' } as never);

    const sched = await schedule(api, loan.id);
    const due = sched.installments.filter((i) => i.dueDate <= istToday());
    expect(due.length, 'EMIs fall due 70, ~40 and ~10 days ago').toBe(3);
    const last = due[due.length - 1];
    const repaid = due.reduce((s, i) => s + Math.round(Number(i.principal) * 100), 0) / 100;
    const outstanding = Number((await getLoan(api, loan.id)).loan.outstandingPrincipal);

    const row = (await netWorthRows(api))['BD Loan'];
    expect(row).toMatchObject({ id: loan.id, side: 'liability' });
    expect(row.value).toBe(Number(last.closingBalance));
    expect(row.value).toBe(outstanding);

    const b = await rowBreakdown(api, 'net_worth', loan.id);
    const totalLabel = `Outstanding after EMI #${last.seq} (${ddmmyyyy(last.dueDate)})`;
    expect(b).toMatchObject({ title: 'BD Loan', kindLabel: 'Loan', subtitle: 'Liability', total: row.value, totalLabel });
    expect(stepsOf(b)).toEqual([
      ['start', 'Loan principal', 120000],
      ['subtract', 'Principal repaid through 3 EMIs due so far', repaid],
      ['subtract', 'Prepayments (1)', 10000],
      ['equals', totalLabel, row.value],
    ]);
    expectReconciles(b);
    expect(b.notes).toEqual([]);

    const installments = sectionOf(b, 'installments');
    expect(installments).toMatchObject({ label: 'EMIs due so far', rowAction: null });
    expect(installments.rows.columns.map((c) => c.key)).toEqual(['seq', 'dueDate', 'emi', 'interest', 'principal', 'closingBalance']);
    expect(installments.rows.rows.map((r) => [r.seq, r.dueDate, r.principal, r.closingBalance]), 'newest EMI first').toEqual(
      [...due].reverse().map((i) => [i.seq, i.dueDate, i.principal, i.closingBalance])
    );
    expect(sectionOf(b, 'prepayments').rows.rows.map((r) => [r.date, r.amount, r.counted])).toEqual([[istToday(-50), 10000, true]]);
    const installments1 = await breakdownSection(api, 'net_worth', loan.id, 'installments', { page: 1, size: 2 });
    expect(installments1.rows.map((r) => r.seq)).toEqual([due[0].seq]);
  });

  test('a loan with no prepayments has no prepayments section', async ({ request }) => {
    const { api } = await newUser(request, 'bd-loan-plain');
    const loan = await createLoan(api, { name: 'BD Plain Loan', startDate: istToday(-60), firstEmiDate: istToday(-30) });
    const b = await rowBreakdown(api, 'net_worth', loan.id);
    expect(b.sections.map((s) => s.key)).toEqual(['installments']);
    expectReconciles(b);
    expect(await sectionStatus(api, 'net_worth', loan.id, 'prepayments')).toBe(404);
  });

  test('a counterparty: money out minus money in, as an asset or a liability', async ({ request }) => {
    const { api } = await newUser(request, 'bd-lending');
    const debtor = await createCounterparty(api, { name: 'BD Debtor' });
    const lent = await addLending(api, { counterpartyId: debtor.id, direction: 'lent', amount: 5000, entryDate: istToday(-10), notes: 'Trip' });
    const back = await addLending(api, { counterpartyId: debtor.id, direction: 'borrowed', amount: 1500, entryDate: istToday(-5) });
    const creditor = await createCounterparty(api, { name: 'BD Creditor' });
    await addLending(api, { counterpartyId: creditor.id, direction: 'borrowed', amount: 800, entryDate: istToday(-7) });

    const rows = await netWorthRows(api);
    expect(rows['BD Debtor']).toMatchObject({ value: 3500, side: 'asset' });
    expect(rows['BD Creditor']).toMatchObject({ value: 800, side: 'liability' });

    const d = await rowBreakdown(api, 'net_worth', debtor.id);
    expect(d).toMatchObject({ title: 'BD Debtor', kindLabel: 'Lending', subtitle: 'Asset', total: 3500, totalLabel: 'They owe you' });
    expect(stepsOf(d)).toEqual([
      ['add', 'You lent / paid them (1)', 5000],
      ['subtract', 'They paid you / you borrowed (1)', 1500],
      ['equals', 'They owe you', 3500],
    ]);
    expectReconciles(d);
    const entries = sectionOf(d, 'entries');
    expect(entries).toMatchObject({ label: 'Entries', rowAction: null });
    expect(entries.rows.rows).toEqual([
      { id: back.id, date: istToday(-5), direction: 'Borrowed', kind: 'Principal', amount: 1500, notes: null },
      { id: lent.id, date: istToday(-10), direction: 'Lent', kind: 'Principal', amount: 5000, notes: 'Trip' },
    ]);
    const entries1 = await breakdownSection(api, 'net_worth', debtor.id, 'entries', { page: 1, size: 1 });
    expect(entries1.rows.map((r) => r.id)).toEqual([lent.id]);

    const c = await rowBreakdown(api, 'net_worth', creditor.id);
    expect(c).toMatchObject({ subtitle: 'Liability', total: 800, totalLabel: 'You owe them' });
    expect(stepsOf(c)).toEqual([
      ['add', 'They paid you / you borrowed (1)', 800],
      ['equals', 'You owe them', 800],
    ]);
    expectReconciles(c);
  });
});

test.describe('Row breakdown: not found and refused (@api)', () => {
  test('only listed rows of datasources with a breakdown open one', async ({ request }) => {
    const { api } = await newUser(request, 'bd-errors');
    const hidden = await createBankAccount(api, { name: 'BD Hidden', openingBalance: 50, excludeFromNetAsset: true });
    const closed = await createBankAccount(api, { name: 'BD Closed', openingBalance: 50 });
    expectStatus(
      await api.POST('/api/v1/accounts/{id}/close', { params: { path: { id: closed.id } }, body: { closedOn: istToday(-1) } }),
      200
    );
    const settled = await createCounterparty(api, { name: 'BD Settled' });
    await addLending(api, { counterpartyId: settled.id, direction: 'lent', amount: 100, entryDate: istToday(-5) });
    await addLending(api, { counterpartyId: settled.id, direction: 'borrowed', amount: 100, entryDate: istToday(-4) });
    const bank = await createBankAccount(api, { name: 'BD Open', openingBalance: 50 });

    // Rows that are not counted in net worth have no breakdown.
    expect(await breakdownStatus(api, 'net_worth', hidden.id)).toBe(404);
    expect(await breakdownStatus(api, 'net_worth', closed.id)).toBe(404);
    expect(await breakdownStatus(api, 'net_worth', settled.id)).toBe(404);
    expect(await breakdownStatus(api, 'net_worth', randomUUID())).toBe(404);
    expect(await breakdownStatus(api, 'net_worth', 'not-a-uuid')).toBe(404);
    expect(await breakdownStatus(api, 'positions', randomUUID())).toBe(404);
    expect(await breakdownStatus(api, 'positions', 'not-a-uuid')).toBe(404);

    // Unknown section of a real row.
    expect(await sectionStatus(api, 'net_worth', bank.id, 'holdings')).toBe(404);
    expect(await sectionStatus(api, 'net_worth', bank.id, 'nope')).toBe(404);
    expect(await sectionStatus(api, 'net_worth', hidden.id, 'transactions')).toBe(404);

    // A datasource without a breakdown, and an unknown datasource.
    const plain = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', {
      params: { path: { name: 'transactions', rowId: randomUUID() } },
    });
    expectStatus(plain, 400);
    expect((plain.error as { message: string }).message).toBe('No breakdown for Transactions');
    expect(await breakdownStatus(api, 'no_such_datasource', bank.id)).toBe(400);

    // The datasources with a breakdown say so in their underlying data; the rest have no row action.
    expect((await underlyingBuiltin(api, 'net_worth')).rowAction).toBe('breakdown');
    expect((await underlyingAdHoc(api, kpiBody('lendings', { measure: 'amount', aggregation: 'sum', filters: [] }))).rowAction).toBeNull();
  });

  test("another user's rows are not found", async ({ request }) => {
    const a = await newUser(request, 'bd-tenant-a');
    const b = await newUser(request, 'bd-tenant-b');
    const bank = await createBankAccount(a.api, { name: 'BD A Bank', openingBalance: 900 });
    const cp = await createCounterparty(a.api, { name: 'BD A Friend' });
    await addLending(a.api, { counterpartyId: cp.id, direction: 'lent', amount: 400, entryDate: istToday(-3) });
    const loan = await createLoan(a.api, { name: 'BD A Loan', startDate: istToday(-60), firstEmiDate: istToday(-30) });
    const broker = await createBrokerAccount(a.api, { name: 'BD A Broker', cashBalance: 0 });
    const inst = await resolveInstrument(a.api, { type: 'stock', name: `BD A Inst ${uniqueSeedSuffix()}`, isin: generateIsin() });
    await trade(a.api, { brokerAccountId: broker.id, instrumentId: inst.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-9) });
    const holding = String(sectionOf(await rowBreakdown(a.api, 'net_worth', broker.id), 'holdings').rows.rows[0].id);

    for (const id of [bank.id, cp.id, loan.id, broker.id]) {
      expect(await breakdownStatus(b.api, 'net_worth', id), `net_worth ${id}`).toBe(404);
    }
    expect(await sectionStatus(b.api, 'net_worth', bank.id, 'transactions')).toBe(404);
    expect(await sectionStatus(b.api, 'net_worth', cp.id, 'entries')).toBe(404);
    expect(await sectionStatus(b.api, 'net_worth', loan.id, 'installments')).toBe(404);
    expect(await sectionStatus(b.api, 'net_worth', broker.id, 'holdings')).toBe(404);
    expect(await breakdownStatus(b.api, 'positions', holding)).toBe(404);
    expect(await sectionStatus(b.api, 'positions', holding, 'lots')).toBe(404);
    // The owner still sees them.
    expect(await breakdownStatus(a.api, 'positions', holding)).toBe(200);
  });
});
