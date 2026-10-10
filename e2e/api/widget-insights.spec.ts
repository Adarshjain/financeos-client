import { randomUUID } from 'node:crypto';

import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import {
  createBankAccount,
  createBrokerAccount,
  createCreditCard,
  createGenericAccount,
} from '../fixtures/seed/accounts';
import { addLending, createCounterparty } from '../fixtures/seed/loans';
import { ingestCardStatement } from '../fixtures/seed/nav';
import { runAdHoc } from '../fixtures/seed/reports';
import { createTransaction } from '../fixtures/seed/transactions';
import { ddmmyyyy, kpiBody, rowBreakdown, underlyingAdHoc } from '../fixtures/seed/underlying';
import {
  type EmergencyFundResponse,
  istMonth,
  linkTransactions,
  monthRange,
  round1,
  ym,
} from '../fixtures/seed/widgets';
import { expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

async function balanceSeries(api: ApiClient, id: string, days?: number) {
  return api.GET('/api/v1/accounts/{id}/balance-series', { params: { path: { id }, query: days === undefined ? {} : { days } } });
}

/** The series as date → balance. */
async function seriesByDate(api: ApiClient, id: string, days?: number): Promise<Record<string, number>> {
  const res = await balanceSeries(api, id, days);
  expectStatus(res, 200);
  return Object.fromEntries(res.data!.map((p) => [p.date, Number(p.balance)]));
}

async function emergencyFund(api: ApiClient): Promise<EmergencyFundResponse> {
  const res = await api.GET('/api/v1/insights/emergency-fund');
  expectStatus(res, 200);
  return res.data!;
}

async function kpiValue(api: ApiClient, datasource: string, measure: string, filters: unknown[]): Promise<number> {
  const data = (await runAdHoc(api, kpiBody(datasource, { measure, aggregation: 'sum', filters }))) as unknown as { value: number | null };
  return Number(data.value ?? 0);
}

/** The ad-hoc KPI the emergency fund's month drill opens (the widget's monthOutflowRequest). */
function monthOutflowFilters(month: string, accountIds: string[]): unknown[] {
  const [y, m] = month.split('-').map(Number);
  const { from, to } = monthRange({ year: y, month: m });
  return [
    { field: 'account', operator: 'in', value: accountIds },
    { field: 'type', operator: 'is', value: 'DEBIT' },
    { field: 'isExcluded', operator: 'is', value: false },
    { field: 'linkType', operator: 'not_in', value: ['TRANSFER', 'REVERSAL'] },
    { field: 'date', operator: 'between', value: { from, to } },
  ];
}

/** A day of the month `offset` months from the current IST month. */
function dayIn(offset: number, day: number): string {
  return `${ym(istMonth(offset))}-${String(day).padStart(2, '0')}`;
}

async function getAccount(api: ApiClient, id: string) {
  const res = await api.GET('/api/v1/accounts/{id}', { params: { path: { id } } });
  expectStatus(res, 200);
  return res.data as unknown as { id: string; balance: number; utilizationPct?: number | null; effectiveCreditLimit?: number | null };
}

async function listedAccount(api: ApiClient, id: string) {
  const res = await api.GET('/api/v1/accounts');
  expectStatus(res, 200);
  return (res.data as unknown as Array<{ id: string; utilizationPct?: number | null; effectiveCreditLimit?: number | null }>).find((a) => a.id === id)!;
}

test.describe('GET /accounts/{id}/balance-series (@api)', () => {
  test('a bank account: one end-of-day balance per day, oldest first, ending today without future-dated rows', async ({ request }) => {
    const { api } = await newUser(request, 'series-bank');
    const bank = await createBankAccount(api, { name: 'Series Bank', openingBalance: 1000 });
    await createTransaction(api, bank.id, { amount: -200, date: istToday(-5), description: 'Series debit' });
    await createTransaction(api, bank.id, { amount: 500, date: istToday(-2), description: 'Series credit' });
    await createTransaction(api, bank.id, { amount: -100, date: istToday(), description: 'Series today' });
    await createTransaction(api, bank.id, { amount: 50, date: istToday(3), description: 'Series future' });

    const res = await balanceSeries(api, bank.id);
    expectStatus(res, 200);
    const points = res.data!;
    expect(points, 'the default is 30 days').toHaveLength(30);
    expect(points[0].date).toBe(istToday(-29));
    expect(points[29].date).toBe(istToday());
    expect(points.map((p) => p.date)).toEqual([...points.map((p) => p.date)].sort());

    const byDate = Object.fromEntries(points.map((p) => [p.date, Number(p.balance)]));
    expect(byDate[istToday(-29)]).toBe(1000);
    expect(byDate[istToday(-6)]).toBe(1000);
    expect(byDate[istToday(-5)]).toBe(800);
    expect(byDate[istToday(-3)]).toBe(800);
    expect(byDate[istToday(-2)]).toBe(1300);
    expect(byDate[istToday(-1)]).toBe(1300);
    expect(byDate[istToday()]).toBe(1200);
    // The account's balance includes the future-dated credit; today's point does not.
    expect(Number((await getAccount(api, bank.id)).balance)).toBe(1250);
  });

  test('days bounds: 1 and 365 are served, 0, 366 and negatives are 400', async ({ request }) => {
    const { api } = await newUser(request, 'series-bounds');
    const bank = await createBankAccount(api, { name: 'Bounds Bank', openingBalance: 10 });
    const one = await balanceSeries(api, bank.id, 1);
    expectStatus(one, 200);
    expect(one.data).toEqual([{ date: istToday(), balance: 10 }]);
    const year = await balanceSeries(api, bank.id, 365);
    expectStatus(year, 200);
    expect(year.data).toHaveLength(365);
    expect(year.data![0].date).toBe(istToday(-364));
    for (const days of [0, 366, -1]) {
      const res = await balanceSeries(api, bank.id, days);
      expect(res.response.status, `days=${days}`).toBe(400);
      expect(res.error?.code, `days=${days}`).toBe('VALIDATION_ERROR');
    }
  });

  test('a credit card walks back its money-signed balance; a broker has no series', async ({ request }) => {
    const { api } = await newUser(request, 'series-card');
    const card = await createCreditCard(api, { name: 'Series Card' });
    await createTransaction(api, card.id, { amount: -3000, date: istToday(-3), description: 'Card spend' });
    await createTransaction(api, card.id, { amount: 1000, date: istToday(-1), description: 'Card payment' });
    const byDate = await seriesByDate(api, card.id, 7);
    expect(byDate).toEqual({
      [istToday(-6)]: 0,
      [istToday(-5)]: 0,
      [istToday(-4)]: 0,
      [istToday(-3)]: -3000,
      [istToday(-2)]: -3000,
      [istToday(-1)]: -2000,
      [istToday()]: -2000,
    });
    expect(byDate[istToday()]).toBe(Number((await getAccount(api, card.id)).balance));

    const broker = await createBrokerAccount(api, { name: 'Series Broker', cashBalance: 5000 });
    const brokerSeries = await balanceSeries(api, broker.id);
    expectStatus(brokerSeries, 200);
    expect(brokerSeries.data).toEqual([]);
  });

  test("another user's account and an unknown id are 404; it needs a session", async ({ request }) => {
    const a = await newUser(request, 'series-tenant-a');
    const b = await newUser(request, 'series-tenant-b');
    const bank = await createBankAccount(a.api, { name: 'Private Series', openingBalance: 99 });
    expect((await balanceSeries(b.api, bank.id)).response.status).toBe(404);
    expect((await balanceSeries(a.api, randomUUID())).response.status).toBe(404);
    expect((await balanceSeries(a.api, bank.id)).response.status).toBe(200);
    await expectUnauthenticated('GET', `/api/v1/accounts/${bank.id}/balance-series`);
  });
});

test.describe('GET /insights/emergency-fund (@api)', () => {
  test('a new user: no liquid accounts, six months all before history, no figure', async ({ request }) => {
    const { api } = await newUser(request, 'ef-empty');
    const fund = await emergencyFund(api);
    expect(fund).toMatchObject({ accounts: [], historyMonths: 0, monthsCovered: null, band: null });
    expect(Number(fund.liquidBalance)).toBe(0);
    expect(Number(fund.medianOutflow)).toBe(0);
    expect(fund.months.map((m) => m.month)).toEqual([-6, -5, -4, -3, -2, -1].map((o) => ym(istMonth(o))));
    expect(fund.months.every((m) => m.beforeHistory && Number(m.outflow) === 0)).toBe(true);
  });

  test('liquid = open bank + wallet accounts not excluded; outflow leaves out transfers, reversals and excluded rows; card bills count', async ({
    request,
  }) => {
    test.slow();
    const { api } = await newUser(request, 'ef-full');
    const bank = await createBankAccount(api, { name: 'EF Bank', openingBalance: 50000 });
    const wallet = await createGenericAccount(api, { name: 'EF Wallet' });
    const hidden = await createBankAccount(api, { name: 'EF Hidden', openingBalance: 99999, excludeFromNetAsset: true });
    const closed = await createBankAccount(api, { name: 'EF Closed', openingBalance: 3000 });
    const card = await createCreditCard(api, { name: 'EF Card' });

    // History starts with the first transaction on a liquid account: day 1 of six months ago.
    await createTransaction(api, bank.id, { amount: -1000, date: dayIn(-6, 1), description: 'EF m6' });
    await createTransaction(api, bank.id, { amount: -2000, date: dayIn(-5, 10), description: 'EF m5' });
    await createTransaction(api, wallet.id, { amount: 10000, date: dayIn(-4, 2), description: 'EF wallet top-up' });
    await createTransaction(api, wallet.id, { amount: -3000, date: dayIn(-4, 10), description: 'EF m4 wallet' });
    await createTransaction(api, bank.id, { amount: -4000, date: dayIn(-3, 10), description: 'EF m3' });
    await createTransaction(api, bank.id, { amount: -5000, date: dayIn(-2, 10), description: 'EF m2' });
    // Month -2 also has a transfer to the wallet, a reversed debit and an excluded debit: none is outflow.
    const transferOut = await createTransaction(api, bank.id, { amount: -7000, date: dayIn(-2, 12), description: 'EF transfer out' });
    const transferIn = await createTransaction(api, wallet.id, { amount: 7000, date: dayIn(-2, 12), description: 'EF transfer in' });
    await linkTransactions(api, 'TRANSFER', transferOut.id, transferIn.id);
    const reversed = await createTransaction(api, bank.id, { amount: -800, date: dayIn(-2, 14), description: 'EF reversed' });
    const reversal = await createTransaction(api, bank.id, { amount: 800, date: dayIn(-2, 15), description: 'EF reversal' });
    await linkTransactions(api, 'REVERSAL', reversed.id, reversal.id);
    await createTransaction(api, bank.id, { amount: -900, date: dayIn(-2, 16), description: 'EF excluded', isTransactionExcluded: true });
    // Month -1: a card bill paid from the bank is outflow.
    await createTransaction(api, bank.id, { amount: -6000, date: dayIn(-1, 10), description: 'EF m1' });
    const billPaid = await createTransaction(api, bank.id, { amount: -1500, date: dayIn(-1, 20), description: 'EF card bill' });
    const billIn = await createTransaction(api, card.id, { amount: 1500, date: dayIn(-1, 20), description: 'EF card payment' });
    await linkTransactions(api, 'CC_PAYMENT', billPaid.id, billIn.id);
    // Not liquid: the excluded account, the closed one, the card. Not a full month: today.
    await createTransaction(api, hidden.id, { amount: -11111, date: dayIn(-1, 5), description: 'EF hidden spend' });
    await createTransaction(api, closed.id, { amount: -2222, date: dayIn(-1, 5), description: 'EF closed spend' });
    expectStatus(await api.POST('/api/v1/accounts/{id}/close', { params: { path: { id: closed.id } }, body: { closedOn: istToday(-1) } }), 200);
    await createTransaction(api, card.id, { amount: -4444, date: dayIn(-1, 6), description: 'EF card spend' });
    await createTransaction(api, bank.id, { amount: -333, date: istToday(), description: 'EF this month' });

    const fund = await emergencyFund(api);
    expect(fund.accounts.map((a) => [a.name, a.type]).sort()).toEqual([
      ['EF Bank', 'bank_account'],
      ['EF Wallet', 'generic'],
    ]);
    const bankBalance = 50000 - 1000 - 2000 - 4000 - 5000 - 7000 - 800 + 800 - 900 - 6000 - 1500 - 333;
    const walletBalance = 10000 - 3000 + 7000;
    expect(Number(fund.accounts.find((a) => a.id === bank.id)!.balance)).toBe(bankBalance);
    expect(Number(fund.accounts.find((a) => a.id === wallet.id)!.balance)).toBe(walletBalance);
    expect(Number(fund.liquidBalance)).toBe(bankBalance + walletBalance);

    const outflows = [1000, 2000, 3000, 4000, 5000, 7500];
    expect(fund.months.map((m) => [m.month, Number(m.outflow), m.beforeHistory])).toEqual(
      [-6, -5, -4, -3, -2, -1].map((o, i) => [ym(istMonth(o)), outflows[i], false])
    );
    expect(fund.historyMonths).toBe(6);
    expect(Number(fund.medianOutflow)).toBe(3500);
    expect(Number(fund.monthsCovered)).toBe(round1((bankBalance + walletBalance) / 3500));
    expect(fund.band).toBe('high');

    // Each month's outflow is exactly what its drill (an ad-hoc spend KPI) adds up.
    const ids = fund.accounts.map((a) => a.id);
    for (const m of fund.months) {
      expect(await kpiValue(api, 'transactions', 'spend', monthOutflowFilters(m.month, ids)), m.month).toBe(Number(m.outflow));
    }
    // The month drill lists exactly the counted debits.
    const m2 = await underlyingAdHoc(api, kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: monthOutflowFilters(ym(istMonth(-2)), ids) }), { size: 50 });
    expect(Number(m2.value)).toBe(5000);
    expect(m2.rowCount).toBe(1);
    // The liquid balance is net worth's bank + wallet rows.
    expect(await kpiValue(api, 'net_worth', 'signedValue', [{ field: 'kind', operator: 'in', value: ['bank_account', 'generic'] }])).toBe(
      bankBalance + walletBalance
    );
  });

  test('history starts at the first full month: earlier months are flagged and left out of the median', async ({ request }) => {
    const { api } = await newUser(request, 'ef-history');
    const bank = await createBankAccount(api, { name: 'History Bank', openingBalance: 1000 });
    // First transaction on day 10 of three months ago: that month is partial, so history starts the month after.
    await createTransaction(api, bank.id, { amount: -100, date: dayIn(-3, 10), description: 'H first' });
    await createTransaction(api, bank.id, { amount: -300, date: dayIn(-2, 5), description: 'H m2' });
    await createTransaction(api, bank.id, { amount: -500, date: dayIn(-1, 5), description: 'H m1' });

    const fund = await emergencyFund(api);
    expect(fund.months.map((m) => [m.month, Number(m.outflow), m.beforeHistory])).toEqual([
      [ym(istMonth(-6)), 0, true],
      [ym(istMonth(-5)), 0, true],
      [ym(istMonth(-4)), 0, true],
      [ym(istMonth(-3)), 100, true],
      [ym(istMonth(-2)), 300, false],
      [ym(istMonth(-1)), 500, false],
    ]);
    expect(fund.historyMonths).toBe(2);
    expect(Number(fund.medianOutflow)).toBe(400);
    expect(Number(fund.liquidBalance)).toBe(100);
    expect(Number(fund.monthsCovered)).toBe(0.3);
    expect(fund.band).toBe('low');
  });

  test('only excluded bank accounts: nothing is liquid', async ({ request }) => {
    const { api } = await newUser(request, 'ef-excluded');
    const hidden = await createBankAccount(api, { name: 'Only Hidden', openingBalance: 5000, excludeFromNetAsset: true });
    await createTransaction(api, hidden.id, { amount: -100, date: dayIn(-2, 2), description: 'Hidden spend' });
    const fund = await emergencyFund(api);
    expect(fund.accounts).toEqual([]);
    expect(Number(fund.liquidBalance)).toBe(0);
    expect(fund.historyMonths).toBe(0);
    expect(fund.monthsCovered ?? null).toBeNull();
  });

  test('per user and behind a session', async ({ request }) => {
    const a = await newUser(request, 'ef-tenant-a');
    const b = await newUser(request, 'ef-tenant-b');
    await createBankAccount(a.api, { name: 'A Liquid', openingBalance: 4000 });
    expect((await emergencyFund(a.api)).accounts).toHaveLength(1);
    const other = await emergencyFund(b.api);
    expect(other.accounts).toEqual([]);
    expect(Number(other.liquidBalance)).toBe(0);
    await expectUnauthenticated('GET', '/api/v1/insights/emergency-fund');
  });
});

test.describe('GET /counterparties?outstanding&sort=net (@api)', () => {
  test('outstanding keeps nonzero net positions; sort=net orders by absolute net, largest first, then name', async ({ request }) => {
    const { api } = await newUser(request, 'cp-outstanding');
    const aarav = await createCounterparty(api, { name: 'Aarav' });
    const bela = await createCounterparty(api, { name: 'Bela' });
    const chirag = await createCounterparty(api, { name: 'Chirag' });
    const dev = await createCounterparty(api, { name: 'Dev' });
    const esha = await createCounterparty(api, { name: 'Esha' });
    await addLending(api, { counterpartyId: aarav.id, direction: 'lent', amount: 1000, entryDate: istToday(-9) });
    await addLending(api, { counterpartyId: bela.id, direction: 'borrowed', amount: 8000, entryDate: istToday(-9) });
    await addLending(api, { counterpartyId: chirag.id, direction: 'lent', amount: 5000, entryDate: istToday(-9) });
    await addLending(api, { counterpartyId: dev.id, direction: 'lent', amount: 300, entryDate: istToday(-9) });
    await addLending(api, { counterpartyId: dev.id, direction: 'borrowed', amount: 300, entryDate: istToday(-8) });
    await addLending(api, { counterpartyId: esha.id, direction: 'lent', amount: 1000, entryDate: istToday(-7) });

    const list = async (query: { outstanding?: boolean; sort?: string[]; page?: number; size?: number; q?: string }) => {
      const res = await api.GET('/api/v1/counterparties', { params: { query } });
      expectStatus(res, 200);
      return res.data!;
    };
    const names = (page: { content: Array<{ name: string }> }) => page.content.map((c) => c.name);

    const byNet = await list({ outstanding: true, sort: ['net'] });
    expect(names(byNet)).toEqual(['Bela', 'Chirag', 'Aarav', 'Esha']);
    expect(byNet.content.map((c) => Number(c.netPosition))).toEqual([-8000, 5000, 1000, 1000]);
    expect(byNet.totalElements).toBe(4);

    expect(names(await list({ outstanding: true })), 'name order by default').toEqual(['Aarav', 'Bela', 'Chirag', 'Esha']);
    expect(names(await list({ sort: ['net'] })), 'settled people last when not filtered').toEqual(['Bela', 'Chirag', 'Aarav', 'Esha', 'Dev']);
    expect(names(await list({})), 'unchanged without the new params').toEqual(['Aarav', 'Bela', 'Chirag', 'Dev', 'Esha']);
    expect(names(await list({ outstanding: false, sort: ['name,asc'] }))).toEqual(['Aarav', 'Bela', 'Chirag', 'Dev', 'Esha']);

    const first = await list({ outstanding: true, sort: ['net'], size: 2, page: 0 });
    expect(names(first)).toEqual(['Bela', 'Chirag']);
    expect(first.totalElements).toBe(4);
    expect(first.totalPages).toBe(2);
    expect(names(await list({ outstanding: true, sort: ['net'], size: 2, page: 1 }))).toEqual(['Aarav', 'Esha']);
    expect(names(await list({ outstanding: true, sort: ['net'], q: 'ir' }))).toEqual(['Chirag']);
  });

  test('the outstanding list is per user', async ({ request }) => {
    const a = await newUser(request, 'cp-tenant-a');
    const b = await newUser(request, 'cp-tenant-b');
    await addLending(a.api, { newCounterpartyName: 'Only A Friend', direction: 'lent', amount: 700, entryDate: istToday(-3) });
    const res = await b.api.GET('/api/v1/counterparties', { params: { query: { outstanding: true, sort: ['net'] } } });
    expectStatus(res, 200);
    expect(res.data!.content).toEqual([]);
    expect(res.data!.totalElements).toBe(0);
  });
});

test.describe('Live credit-card utilisation (@api)', () => {
  test('GET /accounts and /accounts/{id}: owed now ÷ limit; a card in credit is 0%, not its absolute balance', async ({ request }) => {
    const { api } = await newUser(request, 'util-live');
    const card = await createCreditCard(api, { name: 'Util Card', creditLimit: 50000 });
    let one = await getAccount(api, card.id);
    expect(Number(one.utilizationPct)).toBe(0);
    expect(Number(one.effectiveCreditLimit)).toBe(50000);

    await createTransaction(api, card.id, { amount: -12000, date: istToday(-2), description: 'Util spend' });
    one = await getAccount(api, card.id);
    expect(Number(one.utilizationPct)).toBe(24);
    const listed = await listedAccount(api, card.id);
    expect(Number(listed.utilizationPct), 'the list reports the same figure').toBe(24);
    expect(Number(listed.effectiveCreditLimit)).toBe(50000);

    await createTransaction(api, card.id, { amount: 20000, date: istToday(-1), description: 'Util overpaid' });
    one = await getAccount(api, card.id);
    expect(Number(one.balance)).toBe(8000);
    expect(Number(one.utilizationPct), 'in credit is not utilised').toBe(0);
    expect(Number((await listedAccount(api, card.id)).utilizationPct)).toBe(0);

    // Only cards carry utilisation.
    const bank = await createBankAccount(api, { name: 'Util Bank', openingBalance: 100 });
    const bankRow = await listedAccount(api, bank.id);
    expect(bankRow.utilizationPct ?? null).toBeNull();
    expect(bankRow.effectiveCreditLimit ?? null).toBeNull();
  });

  test('a card without its own limit falls back to the latest statement’s, else has no figure', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'util-fallback');
    const card = await createCreditCard(api, { name: 'No Limit Card', last4: '6611', creditLimit: 0 });
    await createTransaction(api, card.id, { amount: -500, date: istToday(-1), description: 'No limit spend' });
    let one = await getAccount(api, card.id);
    expect(one.utilizationPct ?? null).toBeNull();
    expect(one.effectiveCreditLimit ?? null).toBeNull();

    await ingestCardStatement(api, card.id, '6611');
    one = await getAccount(api, card.id);
    expect(Number(one.effectiveCreditLimit), "the statement's limit").toBe(100000);
    expect(Number(one.utilizationPct)).toBe(round1((Math.max(0, -Number(one.balance)) / 100000) * 100));
  });

  test('card cycle summary and the bill digest report the same live figure as the account, and move with new spend', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'util-surfaces');
    const card = await createCreditCard(api, { name: 'Surface Card', last4: '6622', creditLimit: 100000 });
    await ingestCardStatement(api, card.id, '6622');

    const figures = async () => {
      const account = await getAccount(api, card.id);
      const summary = await api.GET('/api/v1/accounts/{id}/card-summary', { params: { path: { id: card.id } } });
      expectStatus(summary, 200);
      const bills = await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } });
      expectStatus(bills, 200);
      const bill = bills.data!.find((b) => b.accountId === card.id)!;
      return {
        owed: Math.max(0, -Number(account.balance)),
        account: Number(account.utilizationPct),
        summary: Number(summary.data!.utilizationPct),
        summaryLimit: Number(summary.data!.creditLimit),
        digest: Number(bill.digest?.utilizationPct),
        digestLimit: Number(bill.digest?.creditLimit),
      };
    };

    const before = await figures();
    expect(before.account).toBe(round1((before.owed / 100000) * 100));
    expect(before.summary).toBe(before.account);
    expect(before.digest).toBe(before.account);
    expect(before.summaryLimit).toBe(100000);
    expect(before.digestLimit).toBe(100000);

    // Spend after the statement: the statement total does not change, the live figure does.
    await createTransaction(api, card.id, { amount: -20000, date: istToday(), description: 'After statement' });
    const after = await figures();
    expect(after.owed).toBe(before.owed + 20000);
    expect(after.account).toBe(round1((after.owed / 100000) * 100));
    expect(after.account).toBeGreaterThan(before.account);
    expect(after.summary).toBe(after.account);
    expect(after.digest).toBe(after.account);
  });
});

test.describe('net_worth breakdown of accounts net worth leaves out (@api)', () => {
  test('an excluded or closed account is explained, flagged not counted with its reason; a counted one is not flagged', async ({ request }) => {
    const { api } = await newUser(request, 'nw-not-counted');
    const hidden = await createBankAccount(api, { name: 'NC Hidden', openingBalance: 50, excludeFromNetAsset: true });
    const closed = await createBankAccount(api, { name: 'NC Closed', openingBalance: 70 });
    await createTransaction(api, closed.id, { amount: -20, date: istToday(-3), description: 'NC closed spend' });
    expectStatus(await api.POST('/api/v1/accounts/{id}/close', { params: { path: { id: closed.id } }, body: { closedOn: istToday(-1) } }), 200);
    const open = await createBankAccount(api, { name: 'NC Open', openingBalance: 90 });

    const h = await rowBreakdown(api, 'net_worth', hidden.id);
    expect(h).toMatchObject({
      rowId: hidden.id,
      title: 'NC Hidden',
      subtitle: 'Not counted in net worth',
      notCounted: true,
      notCountedReason: 'Excluded from net worth',
    });
    expect(Number(h.total)).toBe(50);
    expect(h.notes[0]).toBe('This account is marked excluded from net worth, so its balance is not part of the total.');

    const c = await rowBreakdown(api, 'net_worth', closed.id);
    expect(c).toMatchObject({ title: 'NC Closed', subtitle: 'Not counted in net worth', notCounted: true, notCountedReason: 'Closed' });
    expect(Number(c.total)).toBe(50);
    expect(c.notes[0]).toBe(`This account was closed on ${ddmmyyyy(istToday(-1))}, so its balance is not part of the total.`);
    // Its transactions section still pages.
    const section = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}', {
      params: { path: { name: 'net_worth', rowId: closed.id, section: 'transactions' } },
    });
    expectStatus(section, 200);

    const o = await rowBreakdown(api, 'net_worth', open.id);
    expect(o.notCounted).toBe(false);
    expect(o.notCountedReason ?? null).toBeNull();
    expect(o.subtitle).not.toBe('Not counted in net worth');
  });

  test("another user's excluded or closed account is still 404", async ({ request }) => {
    const a = await newUser(request, 'nw-nc-tenant-a');
    const b = await newUser(request, 'nw-nc-tenant-b');
    const hidden = await createBankAccount(a.api, { name: 'Foreign Hidden', openingBalance: 5, excludeFromNetAsset: true });
    const closed = await createBankAccount(a.api, { name: 'Foreign Closed', openingBalance: 5 });
    expectStatus(await a.api.POST('/api/v1/accounts/{id}/close', { params: { path: { id: closed.id } }, body: { closedOn: istToday(-1) } }), 200);
    for (const id of [hidden.id, closed.id]) {
      const res = await b.api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', { params: { path: { name: 'net_worth', rowId: id } } });
      expect(res.response.status).toBe(404);
    }
  });
});

test.describe('transactions `account` filter by id (@api)', () => {
  test('an id matches that account, a name still matches by name, and negation excludes either', async ({ request }) => {
    const { api } = await newUser(request, 'txn-account-id');
    const a = await createBankAccount(api, { name: 'Filter A', openingBalance: 0 });
    const b = await createBankAccount(api, { name: 'Filter B', openingBalance: 0 });
    const c = await createBankAccount(api, { name: 'Filter C', openingBalance: 0 });
    await createTransaction(api, a.id, { amount: -100, date: istToday(-1) });
    await createTransaction(api, b.id, { amount: -20, date: istToday(-1) });
    await createTransaction(api, c.id, { amount: -3, date: istToday(-1) });

    const spend = (filters: unknown[]) => kpiValue(api, 'transactions', 'spend', filters);
    expect(await spend([{ field: 'account', operator: 'is', value: a.id }])).toBe(100);
    expect(await spend([{ field: 'account', operator: 'is', value: a.id.toUpperCase() }]), 'ids are case-insensitive').toBe(100);
    expect(await spend([{ field: 'account', operator: 'in', value: [a.id, b.id] }])).toBe(120);
    expect(await spend([{ field: 'account', operator: 'in', value: [a.id, 'Filter C'] }]), 'ids and names mix').toBe(103);
    expect(await spend([{ field: 'account', operator: 'is', value: 'Filter B' }]), 'a name still works').toBe(20);
    expect(await spend([{ field: 'account', operator: 'is_not', value: a.id }])).toBe(23);
    expect(await spend([{ field: 'account', operator: 'not_in', value: [a.id, 'Filter B'] }])).toBe(3);
    expect(await spend([{ field: 'account', operator: 'is', value: randomUUID() }])).toBe(0);

    // The underlying data's filter chip reads the id as the account's name.
    const vud = await underlyingAdHoc(api, kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [{ field: 'account', operator: 'in', value: [a.id, b.id] }] }));
    const chip = vud.filters.find((f) => f.field === 'account')!;
    expect(chip.text).toContain('Filter A');
    expect(chip.text).toContain('Filter B');
    expect(chip.text).not.toContain(a.id);
  });

  test("another user's account id matches nothing and is not labelled with its name", async ({ request }) => {
    const owner = await newUser(request, 'txn-account-owner');
    const other = await newUser(request, 'txn-account-other');
    const secret = await createBankAccount(owner.api, { name: 'Secret Account Name', openingBalance: 0 });
    await createTransaction(owner.api, secret.id, { amount: -77, date: istToday(-1) });
    await createBankAccount(other.api, { name: 'Other Own', openingBalance: 0 });

    expect(await kpiValue(other.api, 'transactions', 'spend', [{ field: 'account', operator: 'is', value: secret.id }])).toBe(0);
    const vud = await underlyingAdHoc(
      other.api,
      kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [{ field: 'account', operator: 'is', value: secret.id }] })
    );
    expect(vud.rowCount).toBe(0);
    expect(vud.filters.find((f) => f.field === 'account')!.text).not.toContain('Secret Account Name');
  });
});
