import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedCardBill } from '../fixtures/seed/obligations';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/** The synthetic statement totals 6000 (4500 + 1500) and ended 3 days ago, due in 2 days. */
const BILL = 6000;

test.describe('Bill payment from a bank debit (API)', () => {
  test('payment-candidates lists an unlinked bank debit equal to the bill, and filters by amount', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card A', last4: '7101' });
    const bank = await createBankAccount(api, { name: 'Pay Bank A', last4: '7102' });
    const debit = await createTransaction(api, bank.id, { amount: -BILL, date: istToday(-1), description: 'UPI CARD BILL' });
    await createTransaction(api, bank.id, { amount: -777, date: istToday(-1), description: 'Unrelated debit' });

    const res = await api.GET('/api/v1/bills/{statementId}/payment-candidates', {
      params: { path: { statementId: bill.statementId } },
    });
    expectStatus(res, 200);
    const found = res.data!.find((c) => c.transactionId === debit.id);
    expect(found, 'the equal debit is offered').toBeTruthy();
    expect(found).toMatchObject({ accountId: bank.id, accountName: 'Pay Bank A', amount: BILL, date: istToday(-1) });
    expect(res.data!.some((c) => c.amount === 777), 'a different amount is not offered').toBe(false);

    const other = await api.GET('/api/v1/bills/{statementId}/payment-candidates', {
      params: { path: { statementId: bill.statementId }, query: { amount: 777 } },
    });
    expectStatus(other, 200);
    expect(other.data!.map((c) => c.amount)).toEqual([777]);
  });

  test('EXISTING links the chosen debit: paid, with the bank account and date in payments, and Undo clears it', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card B', last4: '7103' });
    const bank = await createBankAccount(api, { name: 'Pay Bank B', last4: '7104' });
    const debit = await createTransaction(api, bank.id, { amount: -BILL, date: istToday(-1), description: 'UPI CARD BILL' });

    const res = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: { payment: { mode: 'EXISTING', fromTransactionId: debit.id } },
    });
    expectStatus(res, 200);
    expect(res.data!.status).toBe('PAID');
    expect(res.data!.payments).toHaveLength(1);
    expect(res.data!.payments![0]).toMatchObject({
      bankTransactionId: debit.id,
      bankAccountName: 'Pay Bank B',
      date: istToday(-1),
      amount: BILL,
      origin: 'USER',
    });

    const undone = await api.DELETE('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
    });
    expectStatus(undone, 200);
    expect(undone.data!.status).not.toBe('PAID');
    expect(undone.data!.payments).toEqual([]);
  });

  test('EXISTING with a different amount is refused', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card C', last4: '7105' });
    const bank = await createBankAccount(api, { name: 'Pay Bank C', last4: '7106' });
    const debit = await createTransaction(api, bank.id, { amount: -BILL, date: istToday(-1) });

    const res = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: { amount: 100, payment: { mode: 'EXISTING', fromTransactionId: debit.id } },
    });
    expectStatus(res, 400);
    expect(JSON.stringify(res.error)).toContain('The amount must equal the selected debit');
  });

  test('NEW with an account creates the bank debit and the card credit', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card D', last4: '7107' });
    const bank = await createBankAccount(api, { name: 'Pay Bank D', last4: '7108' });

    const res = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: { paidOn: istToday(-1), payment: { mode: 'NEW', fromAccountId: bank.id } },
    });
    expectStatus(res, 200);
    expect(res.data!.status).toBe('PAID');
    expect(res.data!.payments![0]).toMatchObject({ bankAccountName: 'Pay Bank D', date: istToday(-1), amount: BILL });
    expect(res.data!.payments![0].bankTransactionId).toBeTruthy();

    const bankTxns = await api.GET('/api/v1/transactions', { params: { query: { page: 0, size: 100 } } });
    expectStatus(bankTxns, 200);
    const items = bankTxns.data!.content.filter((t) => t.accountId === bank.id);
    expect(items.some((t) => t.amount === -BILL), 'the bank debit exists').toBe(true);
  });

  test('NEW without an account adds the card payment only', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card E', last4: '7109' });
    const res = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: { amount: 1000, payment: { mode: 'NEW' } },
    });
    expectStatus(res, 200);
    expect(res.data!.payments).toHaveLength(1);
    expect(res.data!.payments![0].bankTransactionId ?? null).toBeNull();
    expect(res.data!.payments![0].bankAccountName ?? null).toBeNull();
    expect(res.data!.payments![0].amount).toBeCloseTo(1000, 2);
    expect(res.data!.status).toBe('PARTIAL');
  });

  test('NONE and no payment are today\'s manual mark', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card F', last4: '7110' });
    const none = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: { amount: 500, payment: { mode: 'NONE' } },
    });
    expectStatus(none, 200);
    expect(none.data!.paidSource).toBe('MANUAL');
    expect(none.data!.payments).toEqual([]);
  });

  test('NEW refuses a future date and a date on or before the statement date', async ({ api }) => {
    const bill = await seedCardBill(api, { name: 'Pay Card G', last4: '7111' });
    const future = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: { paidOn: istToday(1), payment: { mode: 'NEW' } },
    });
    expectStatus(future, 400);
    const early = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      // Before the statement's cutoff (its period end, or its last line when that is earlier).
      body: { paidOn: istToday(-30), payment: { mode: 'NEW' } },
    });
    expectStatus(early, 400);
  });
});
