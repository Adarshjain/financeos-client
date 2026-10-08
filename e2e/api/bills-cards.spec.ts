import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { ingestCardStatement } from '../fixtures/seed/nav';
import { createTransaction } from '../fixtures/seed/transactions';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

async function linkPair(api: Parameters<typeof createTransaction>[0], type: 'REFUND' | 'REVERSAL' | 'CC_PAYMENT', anchorId: string, otherId: string) {
  const res = await api.POST('/api/v1/transaction-links', {
    body: { type, members: [{ transactionId: anchorId, isAnchor: true }, { transactionId: otherId, isAnchor: false }] },
  });
  expectStatus(res, 201);
}

test.describe('Bills API: cards without a statement (@api)', () => {
  test('an open card with no statement is an AWAITING_STATEMENT row carrying only the spend so far', async ({ request }) => {
    const { api } = await newUser(request, 'bills-awaiting');
    const card = await createCreditCard(api, { name: 'Awaiting Card', last4: '8401' });
    await createTransaction(api, card.id, { amount: -1200, date: istToday(-5), description: 'Awaiting spend 1' });
    await createTransaction(api, card.id, { amount: -300, date: istToday(-1), description: 'Awaiting spend 2' });
    await createTransaction(api, card.id, { amount: -500, date: istToday(-1), description: 'Excluded spend', isTransactionExcluded: true });
    await createTransaction(api, card.id, { amount: 900, date: istToday(-1), description: 'Credit that never reduces it' });

    const res = await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } });
    expectStatus(res, 200);
    expect(res.data).toHaveLength(1);
    const row = res.data![0];
    expect(row).toMatchObject({
      accountId: card.id,
      accountName: 'Awaiting Card',
      last4: '8401',
      status: 'AWAITING_STATEMENT',
      paidSource: 'NONE',
      muted: false,
    });
    expect(Number(row.unbilledAmount)).toBeCloseTo(1500, 2);
    expect(row.statementId ?? null).toBeNull();
    expect(row.paymentDueDate ?? null).toBeNull();
    expect(row.totalAmountDue ?? null).toBeNull();
    expect(row.remainingAmount ?? null).toBeNull();
    expect(row.daysUntilDue ?? null).toBeNull();
    expect(row.nextStatementExpectedOn ?? null).toBeNull();
    expect(row.possiblePayments).toEqual([]);
  });

  test('a card with no transactions at all has zero unbilled spend', async ({ request }) => {
    const { api } = await newUser(request, 'bills-awaiting-empty');
    const card = await createCreditCard(api, { name: 'Untouched Card', last4: '8402' });
    const row = (await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } })).data![0];
    expect(row.status).toBe('AWAITING_STATEMENT');
    expect(Number(row.unbilledAmount)).toBe(0);
  });

  test('a muted awaiting card is flagged muted', async ({ request }) => {
    const { api } = await newUser(request, 'bills-awaiting-muted');
    const card = await createCreditCard(api, { name: 'Quiet Card', last4: '8403' });
    expectStatus(await api.PUT('/api/v1/notifications/accounts/{accountId}/mute', { params: { path: { accountId: card.id } }, body: { muted: true } }), 200);
    const row = (await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } })).data![0];
    expect(row).toMatchObject({ status: 'AWAITING_STATEMENT', muted: true });
  });

  test('a bank account is never a bill row', async ({ request }) => {
    const { api } = await newUser(request, 'bills-bank');
    const bank = await createBankAccount(api, { name: 'Not A Card' });
    const res = await api.GET('/api/v1/bills');
    expectStatus(res, 200);
    expect(res.data!.some((b) => b.accountId === bank.id)).toBe(false);
  });
});

test.describe('Bills API: accountId filter and ordering (@api)', () => {
  test('accountId narrows the list to one card; unknown and foreign ids give an empty list', async ({ request }) => {
    const a = await newUser(request, 'bills-filter-a');
    const b = await newUser(request, 'bills-filter-b');
    const one = await createCreditCard(a.api, { name: 'Filter One', last4: '8404' });
    const two = await createCreditCard(a.api, { name: 'Filter Two', last4: '8405' });
    const foreign = await createCreditCard(b.api, { name: 'Filter Foreign', last4: '8406' });

    const all = await a.api.GET('/api/v1/bills');
    expect(all.data!.map((x) => x.accountId).sort()).toEqual([one.id, two.id].sort());

    const filtered = await a.api.GET('/api/v1/bills', { params: { query: { accountId: one.id } } });
    expectStatus(filtered, 200);
    expect(filtered.data!.map((x) => x.accountId)).toEqual([one.id]);

    const unknown = await a.api.GET('/api/v1/bills', { params: { query: { accountId: '00000000-0000-0000-0000-000000000000' } } });
    expectStatus(unknown, 200);
    expect(unknown.data).toEqual([]);

    const crossTenant = await a.api.GET('/api/v1/bills', { params: { query: { accountId: foreign.id } } });
    expectStatus(crossTenant, 200);
    expect(crossTenant.data).toEqual([]);

    const malformed = await a.api.GET('/api/v1/bills', { params: { query: { accountId: 'not-a-uuid' as never } } });
    expectStatus(malformed, 400);
  });

  test('the list is ordered: open bills, then cards awaiting a statement, then paid ones', async ({ request }) => {
    const { api } = await newUser(request, 'bills-order');
    const paidCard = await createCreditCard(api, { name: 'Order Paid', last4: '8407' });
    const awaitingCard = await createCreditCard(api, { name: 'Order Awaiting', last4: '8408' });
    const openCard = await createCreditCard(api, { name: 'Order Open', last4: '8409' });

    const paidBill = await ingestCardStatement(api, paidCard.id, '8407');
    await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: paidBill.statementId! } }, body: {} });
    await ingestCardStatement(api, openCard.id, '8409');

    const ids = (await api.GET('/api/v1/bills')).data!.map((x) => x.accountId);
    expect(ids.indexOf(openCard.id)).toBeLessThan(ids.indexOf(awaitingCard.id));
    expect(ids.indexOf(awaitingCard.id)).toBeLessThan(ids.indexOf(paidCard.id));
  });
});

test.describe('Bills API: unbilled spend and the next statement (@api)', () => {
  test('unbilledAmount is the included debits after the statement close; credits and excluded debits never count', async ({ request }) => {
    const { api } = await newUser(request, 'bills-unbilled');
    const card = await createCreditCard(api, { name: 'Unbilled Card', last4: '8410' });
    const bill = await ingestCardStatement(api, card.id, '8410');
    const close = istToday(-3);

    await createTransaction(api, card.id, { amount: -800, date: istToday(-1), description: 'After close 1' });
    await createTransaction(api, card.id, { amount: -200, date: istToday(-2), description: 'After close 2' });
    await createTransaction(api, card.id, { amount: -50, date: istToday(-1), description: 'Excluded after close', isTransactionExcluded: true });
    await createTransaction(api, card.id, { amount: 300, date: istToday(-1), description: 'Credit after close' });
    await createTransaction(api, card.id, { amount: -999, date: close, description: 'On the close date' });
    await createTransaction(api, card.id, { amount: -777, date: istToday(-5), description: 'Before close' });

    const row = (await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } })).data![0];
    expect(row.statementId).toBe(bill.statementId);
    expect(Number(row.unbilledAmount)).toBeCloseTo(1000, 2);
    expect(row.nextStatementExpectedOn, 'the next close is projected after this one').toBeTruthy();
    expect(row.nextStatementExpectedOn! > close).toBe(true);

    const single = await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: bill.statementId! } } });
    expectStatus(single, 200);
    expect(Number(single.data!.unbilledAmount)).toBeCloseTo(1000, 2);
    expect(single.data!.nextStatementExpectedOn).toBe(row.nextStatementExpectedOn);

    const paid = await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: bill.statementId! } }, body: {} });
    expectStatus(paid, 200);
    expect(Number(paid.data!.unbilledAmount), 'mutations return the enriched bill too').toBeCloseTo(1000, 2);
    expect(paid.data!.nextStatementExpectedOn).toBe(row.nextStatementExpectedOn);
  });

  test('a card that gets its first statement stops being awaiting', async ({ request }) => {
    const { api } = await newUser(request, 'bills-first');
    const card = await createCreditCard(api, { name: 'First Card', last4: '8411' });
    const before = (await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } })).data!;
    expect(before.map((b) => b.status)).toEqual(['AWAITING_STATEMENT']);

    await ingestCardStatement(api, card.id, '8411');
    const after = (await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } })).data!;
    expect(after).toHaveLength(1);
    expect(after[0].status).not.toBe('AWAITING_STATEMENT');
    expect(after[0].statementId).toBeTruthy();
  });
});

test.describe('Bills API: refunds and reversals pay the open bill (@api)', () => {
  test('a REFUND-linked credit after the close counts as paid; an unlinked credit is only a possible payment', async ({ request }) => {
    const { api } = await newUser(request, 'bills-refund');
    const card = await createCreditCard(api, { name: 'Refund Card', last4: '8412' });
    const bill = await ingestCardStatement(api, card.id, '8412');

    const purchase = await createTransaction(api, card.id, { amount: -2500, date: istToday(-2), description: 'Online purchase' });
    const refund = await createTransaction(api, card.id, { amount: 2500, date: istToday(-1), description: 'Online refund' });
    await linkPair(api, 'REFUND', purchase.id, refund.id);
    const stray = await createTransaction(api, card.id, { amount: 300, date: istToday(-1), description: 'Unlinked credit' });

    const row = (await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: bill.statementId! } } })).data!;
    expect(row.paidSource).toBe('LINK');
    expect(Number(row.paidAmount)).toBeCloseTo(2500, 2);
    expect(Number(row.remainingAmount)).toBeCloseTo(3500, 2);
    expect(row.possiblePayments.map((p) => p.transactionId)).toEqual([stray.id]);
    expect(Number(row.unbilledAmount), 'the purchase is unbilled spend; the refund never reduces it').toBeCloseTo(2500, 2);
  });

  test('REVERSAL and CC_PAYMENT links add up towards the same bill', async ({ request }) => {
    const { api } = await newUser(request, 'bills-reversal');
    const bank = await createBankAccount(api, { name: 'Reversal Bank' });
    const card = await createCreditCard(api, { name: 'Reversal Card', last4: '8413' });
    const bill = await ingestCardStatement(api, card.id, '8413');
    const read = async () => (await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: bill.statementId! } } })).data!;

    const charge = await createTransaction(api, card.id, { amount: -700, date: istToday(-2), description: 'Mistaken charge' });
    const reversed = await createTransaction(api, card.id, { amount: 700, date: istToday(-1), description: 'Charge reversed' });
    await linkPair(api, 'REVERSAL', charge.id, reversed.id);
    let row = await read();
    expect(row.paidSource).toBe('LINK');
    expect(Number(row.paidAmount)).toBeCloseTo(700, 2);

    const payDebit = await createTransaction(api, bank.id, { amount: -1000, date: istToday(-1), description: 'Card bill payment' });
    const payCredit = await createTransaction(api, card.id, { amount: 1000, date: istToday(-1), description: 'Payment received' });
    await linkPair(api, 'CC_PAYMENT', payDebit.id, payCredit.id);
    row = await read();
    expect(Number(row.paidAmount)).toBeCloseTo(1700, 2);
    expect(Number(row.remainingAmount)).toBeCloseTo(4300, 2);
  });

  test('a REFUND-linked credit dated before the close does not count', async ({ request }) => {
    const { api } = await newUser(request, 'bills-refund-before');
    const card = await createCreditCard(api, { name: 'Early Refund Card', last4: '8414' });
    const bill = await ingestCardStatement(api, card.id, '8414');
    const purchase = await createTransaction(api, card.id, { amount: -400, date: istToday(-9), description: 'Early purchase' });
    const refund = await createTransaction(api, card.id, { amount: 400, date: istToday(-8), description: 'Early refund' });
    await linkPair(api, 'REFUND', purchase.id, refund.id);

    const row = (await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: bill.statementId! } } })).data!;
    expect(row.paidSource).toBe('NONE');
    expect(Number(row.remainingAmount)).toBeCloseTo(6000, 2);
  });
});
