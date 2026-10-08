import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createCreditCard } from '../fixtures/seed/accounts';
import { addLending, createCounterparty, pay } from '../fixtures/seed/loans';
import type { ObligationItemDto } from '../fixtures/seed/nav';
import { getObligations, ingestCardStatement, loanWithFirstEmiIn, setBillDue, shiftDate } from '../fixtures/seed/nav';
import { expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const emi = (items: ObligationItemDto[], loanId: string, seq = 1) =>
  items.find((i) => i.type === 'emi' && i.loanId === loanId && i.installmentSeq === seq);

test.describe('Obligations API (@api)', () => {
  test('EMIs carry title, link, days until and a status that follows the 7 day line', async ({ request }) => {
    const { api } = await newUser(request, 'ob-emi');
    const today = await loanWithFirstEmiIn(api, 'Ob Today', 0);
    const seven = await loanWithFirstEmiIn(api, 'Ob Seven', 7);
    const eight = await loanWithFirstEmiIn(api, 'Ob Eight', 8);
    const past = await loanWithFirstEmiIn(api, 'Ob Past', -5);

    const items = await getObligations(api);

    expect(emi(items, today.id)).toMatchObject({ status: 'due_soon', daysUntil: 0, date: istToday() });
    expect(emi(items, seven.id)).toMatchObject({ status: 'due_soon', daysUntil: 7, date: istToday(7) });
    expect(emi(items, eight.id)).toMatchObject({ status: 'upcoming', daysUntil: 8, date: istToday(8) });
    expect(emi(items, past.id)).toMatchObject({ status: 'overdue', daysUntil: -5, date: istToday(-5) });

    const row = emi(items, seven.id)!;
    expect(row).toMatchObject({
      type: 'emi',
      title: 'Ob Seven EMI #1',
      href: `/loans/${seven.id}?installment=1`,
      loanName: 'Ob Seven',
      accountName: 'Ob Seven',
    });
    expect(Number(row.amount)).toBeGreaterThan(0);
    expect(row.accountId ?? null).toBeNull();
    expect(row.statementId ?? null).toBeNull();
  });

  test('card bills: due soon, then overdue, then gone once paid', async ({ request }) => {
    const { api } = await newUser(request, 'ob-bill');
    const card = await createCreditCard(api, { name: 'Ob Card', last4: '8301' });
    const bill = await ingestCardStatement(api, card.id, '8301');
    const statementId = bill.statementId!;
    const find = async () => (await getObligations(api, { kinds: 'card_bill' })).find((i) => i.statementId === statementId);

    await setBillDue(api, statementId, istToday(2));
    expect(await find()).toMatchObject({
      type: 'card_bill',
      status: 'due_soon',
      daysUntil: 2,
      date: istToday(2),
      title: 'Ob Card ••8301 bill',
      href: `/upcoming?bill=${statementId}`,
      accountId: card.id,
      accountName: 'Ob Card',
    });
    expect(Number((await find())!.amount)).toBeCloseTo(6000, 2);

    await setBillDue(api, statementId, istToday(-1));
    expect(await find()).toMatchObject({ status: 'overdue', daysUntil: -1 });

    await setBillDue(api, statementId, istToday(40));
    expect(await find(), '40 days out is inside the default 3 months').toMatchObject({ status: 'upcoming' });

    const paid = await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } }, body: {} });
    expectStatus(paid, 200);
    expect(await find(), 'a paid bill is no longer an obligation').toBeUndefined();
  });

  test('a card without a statement is neither a bill nor an expected statement', async ({ request }) => {
    const { api } = await newUser(request, 'ob-nostatement');
    const card = await createCreditCard(api, { name: 'Ob Empty Card', last4: '8302' });
    const items = await getObligations(api);
    expect(items.some((i) => i.accountId === card.id)).toBe(false);
  });

  test('a card with a statement also expects the next one on the import page', async ({ request }) => {
    const { api } = await newUser(request, 'ob-expected');
    const card = await createCreditCard(api, { name: 'Ob Expect Card', last4: '8303' });
    await ingestCardStatement(api, card.id, '8303');

    const items = await getObligations(api, { kinds: 'statement_expected' });
    const row = items.find((i) => i.accountId === card.id);
    expect(row).toMatchObject({
      type: 'statement_expected',
      title: 'Ob Expect Card statement expected',
      href: '/transactions/import',
      accountName: 'Ob Expect Card',
    });
    expect(row!.amount ?? null).toBeNull();
    expect(row!.statementId ?? null).toBeNull();
    expect(row!.date! > istToday(-3), 'the next close is after the last statement').toBe(true);
    expect(row!.daysUntil).toBe(daysBetween(istToday(), row!.date!));
  });

  test('lending returns: lent shows "owes you", borrowed shows "You owe", with the net amount', async ({ request }) => {
    const { api } = await newUser(request, 'ob-lending');
    const lent = await createCounterparty(api, { name: 'Ob Debtor' });
    await addLending(api, { counterpartyId: lent.id, direction: 'lent', amount: 3000, entryDate: shiftDate(istToday(), -10), expectedReturnDate: istToday(10) });
    const owed = await createCounterparty(api, { name: 'Ob Creditor' });
    await addLending(api, { counterpartyId: owed.id, direction: 'borrowed', amount: 800, entryDate: shiftDate(istToday(), -10), expectedReturnDate: istToday(5) });

    const items = await getObligations(api, { kinds: 'lending_due' });
    expect(items.every((i) => i.type === 'lending_due')).toBe(true);
    const a = items.find((i) => i.counterpartyId === lent.id)!;
    expect(a).toMatchObject({ title: 'Ob Debtor owes you', direction: 'lent', status: 'upcoming', daysUntil: 10, href: `/loans/lendings/${lent.id}`, accountName: 'Ob Debtor' });
    expect(Number(a.amount)).toBe(3000);
    const b = items.find((i) => i.counterpartyId === owed.id)!;
    expect(b).toMatchObject({ title: 'You owe Ob Creditor', direction: 'borrowed', status: 'due_soon', daysUntil: 5 });
    expect(Number(b.amount)).toBe(800);
  });

  test('ordering: overdue first (oldest first), then by date, undated last', async ({ request }) => {
    const { api } = await newUser(request, 'ob-order');
    await loanWithFirstEmiIn(api, 'Ob Order A', -9);
    await loanWithFirstEmiIn(api, 'Ob Order B', -2);
    await loanWithFirstEmiIn(api, 'Ob Order C', 6);
    await loanWithFirstEmiIn(api, 'Ob Order D', 20);
    const card = await createCreditCard(api, { name: 'Ob Order Card', last4: '8304' });
    const bill = await ingestCardStatement(api, card.id, '8304');
    await setBillDue(api, bill.statementId!, istToday(3));

    const items = await getObligations(api);
    const firstNonOverdue = items.findIndex((i) => i.status !== 'overdue');
    expect(firstNonOverdue).toBeGreaterThan(0);
    expect(items.slice(firstNonOverdue).every((i) => i.status !== 'overdue'), 'no overdue row after a non-overdue one').toBe(true);

    const dates = (rows: ObligationItemDto[]) => rows.filter((i) => i.date).map((i) => i.date!);
    const overdue = dates(items.slice(0, firstNonOverdue));
    expect(overdue).toEqual([...overdue].sort());
    const rest = dates(items.slice(firstNonOverdue));
    expect(rest).toEqual([...rest].sort());

    // Every dated row is consistent with its own date.
    for (const i of items.filter((x) => x.date && x.type !== 'statement_expected')) {
      const days = daysBetween(istToday(), i.date!);
      expect(i.daysUntil, i.title ?? i.type).toBe(days);
      expect(i.status, i.title ?? i.type).toBe(days < 0 ? 'overdue' : days <= 7 ? 'due_soon' : 'upcoming');
    }
  });

  test('kinds filter: single, several, case and spaces, blank and unknown', async ({ request }) => {
    const { api } = await newUser(request, 'ob-kinds');
    await loanWithFirstEmiIn(api, 'Ob Kinds Loan', 3);
    const card = await createCreditCard(api, { name: 'Ob Kinds Card', last4: '8305' });
    const bill = await ingestCardStatement(api, card.id, '8305');
    await setBillDue(api, bill.statementId!, istToday(4));
    const cp = await createCounterparty(api, { name: 'Ob Kinds Person' });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 100, entryDate: shiftDate(istToday(), -3), expectedReturnDate: istToday(6) });

    const types = (items: ObligationItemDto[]) => [...new Set(items.map((i) => i.type))].sort();
    const all = await getObligations(api);
    expect(types(all)).toEqual(['card_bill', 'emi', 'lending_due', 'statement_expected']);

    expect(types(await getObligations(api, { kinds: 'emi' }))).toEqual(['emi']);
    expect(types(await getObligations(api, { kinds: 'card_bill' }))).toEqual(['card_bill']);
    expect(types(await getObligations(api, { kinds: 'lending_due' }))).toEqual(['lending_due']);
    expect(types(await getObligations(api, { kinds: 'statement_expected' }))).toEqual(['statement_expected']);
    expect(types(await getObligations(api, { kinds: 'emi,card_bill' }))).toEqual(['card_bill', 'emi']);
    expect(types(await getObligations(api, { kinds: ' EMI , Card_Bill ' }))).toEqual(['card_bill', 'emi']);
    expect(types(await getObligations(api, { kinds: 'emi,emi' }))).toEqual(['emi']);

    // Blank means everything.
    expect((await getObligations(api, { kinds: '' })).length).toBe(all.length);
    expect((await getObligations(api, { kinds: ',' })).length).toBe(all.length);
    expect((await getObligations(api, { kinds: ' ' })).length).toBe(all.length);

    for (const kinds of ['bogus', 'emi,bogus', 'lending']) {
      const res = await api.GET('/api/v1/obligations/upcoming', { params: { query: { kinds } } });
      expectStatus(res, 400);
      expect(res.error?.code, kinds).toBe('VALIDATION_ERROR');
    }
  });

  test('months is clamped to 1..12 and defaults to 3', async ({ request }) => {
    const { api } = await newUser(request, 'ob-months');
    const far = await loanWithFirstEmiIn(api, 'Ob Months Far', 45);

    const inWindow = async (months?: number) => emi(await getObligations(api, months === undefined ? {} : { months }), far.id) !== undefined;
    expect(await inWindow(1), '45 days is beyond one month').toBe(false);
    expect(await inWindow(2)).toBe(true);
    expect(await inWindow(0), '0 clamps up to 1').toBe(false);
    expect(await inWindow(-6), 'negative clamps up to 1').toBe(false);
    expect(await inWindow(), 'default is 3 months').toBe(true);

    const count = async (months: number) => (await getObligations(api, { months, kinds: 'emi' })).length;
    expect(await count(12)).toBeGreaterThan(await count(3));
    expect(await count(13)).toBe(await count(12));
    expect(await count(500)).toBe(await count(12));
    expect((await getObligations(api, { kinds: 'emi' })).length).toBe(await count(3));
  });

  test('a paid installment is settled: it leaves the list and the next one stays', async ({ request }) => {
    const { api } = await newUser(request, 'ob-loan-pay');
    const loan = await loanWithFirstEmiIn(api, 'Ob Paid Loan', 2);
    const before = await getObligations(api, { kinds: 'emi' });
    const first = emi(before, loan.id, 1)!;
    expect(first).toBeTruthy();
    expect(emi(before, loan.id, 2), 'later installments inside the window are listed too').toBeTruthy();

    await pay(api, loan.id, { installmentSeq: 1, amount: Number(first.amount), paymentDate: istToday() });
    const after = await getObligations(api, { kinds: 'emi', months: 12 });
    expect(emi(after, loan.id, 1), 'the settled installment is gone').toBeUndefined();
    expect(emi(after, loan.id, 2), 'the next installment is now the first unpaid').toBeTruthy();
  });

  test('the list is per user and needs a session', async ({ request }) => {
    const a = await newUser(request, 'ob-tenancy-a');
    const b = await newUser(request, 'ob-tenancy-b');
    const loan = await loanWithFirstEmiIn(a.api, 'Ob Private Loan', 2);
    expect(emi(await getObligations(a.api), loan.id)).toBeTruthy();
    expect(await getObligations(b.api)).toEqual([]);
    await expectUnauthenticated('GET', '/api/v1/obligations/upcoming');
  });
});
