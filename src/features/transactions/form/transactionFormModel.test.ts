import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

import {
  buildRequest,
  defaultAccountId,
  emptyValues,
  formProblems,
  NO_CARD,
  REASONS_REQUIRED,
  reasonsMissing,
  signedAmount,
  valuesFromTransaction,
} from './transactionFormModel';

const accounts = [{ id: 'a1', name: 'HDFC' }] as Account[];
const filled = (over = {}) => ({ ...emptyValues('2026-10-13', 'a1'), amount: '250', ...over });
const stored = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    accountId: 'a1',
    date: '2026-10-12',
    amount: -3600.5,
    description: 'BigBasket',
    source: 'gmail_transaction_alert',
    reviewType: 'NEEDS_REVIEW',
    reviewReasons: ['UNRECONCILED', 'OTHER'],
    createdAt: '',
    ...over,
  }) as Transaction;

describe('defaultAccountId', () => {
  it('is the one account the list is filtered to, else none', () => {
    expect(defaultAccountId(['a1'])).toBe('a1');
    expect(defaultAccountId([])).toBe('');
    expect(defaultAccountId(['a1', 'a2'])).toBe('');
  });
});

describe('values', () => {
  it('starts Add as a debit dated today on the given account', () => {
    expect(emptyValues('2026-10-13', 'a1')).toMatchObject({ direction: 'debit', date: '2026-10-13', accountId: 'a1', cardId: NO_CARD });
  });

  it('fills Edit from the stored transaction, with the sign as a direction and no "Other" reason', () => {
    const v = valuesFromTransaction(stored({ cardId: 'c9', mcc: '5411', monitoringReason: 'x', isTransactionUnderMonitoring: true }));
    expect(v).toMatchObject({ direction: 'debit', amount: '3600.50', date: '2026-10-12', cardId: 'c9', mcc: '5411', monitored: true, reviewType: 'NEEDS_REVIEW' });
    expect(v.reviewReasons).toEqual(['UNRECONCILED']);
    expect(valuesFromTransaction(stored({ amount: 18500 })).direction).toBe('credit');
    expect(valuesFromTransaction(stored({ reviewType: null })).reviewType).toBe('MANUALLY_REVIEWED');
  });

  it('signs the amount: debit out, credit in', () => {
    expect(signedAmount({ direction: 'debit', amount: '250' })).toBe(-250);
    expect(signedAmount({ direction: 'credit', amount: '250.5' })).toBe(250.5);
  });
});

describe('formProblems', () => {
  const ctx = { isUpdate: false, selectableAccounts: accounts };

  it('passes a complete Add', () => {
    expect(formProblems(filled(), ctx)).toEqual({});
  });

  it('asks for an amount above zero, a date and an account', () => {
    const errors = formProblems(filled({ amount: '0', date: '', accountId: '' }), ctx);
    expect(errors).toEqual({
      amount: 'Enter an amount greater than zero',
      date: 'Pick a date',
      accountId: 'Please select an account',
    });
    expect(formProblems(filled({ amount: '' }), ctx).amount).toBeDefined();
  });

  it('says to add an account when there is none to pick', () => {
    expect(formProblems(filled({ accountId: '' }), { ...ctx, selectableAccounts: [] }).accountId).toBe(
      'Add an account to save this transaction',
    );
  });

  it('keeps the Legacy MCC wording', () => {
    expect(formProblems(filled({ mcc: '54' }), ctx).mcc).toBe('MCC code must be exactly 4 digits (or left empty).');
    expect(formProblems(filled({ mcc: '5411' }), ctx).mcc).toBeUndefined();
  });

  it('flags Needs review with no reason on Edit, and clears it once a reason is ticked or the status changes', () => {
    const edit = { isUpdate: true, original: stored({ reviewType: 'MANUALLY_REVIEWED', reviewReasons: [] }), selectableAccounts: accounts };
    const v = filled({ reviewType: 'NEEDS_REVIEW', reviewReasons: [] });
    expect(formProblems(v, edit).reviewType).toBe(REASONS_REQUIRED);
    expect(formProblems({ ...v, reviewReasons: ['DATE_CORRECTED'] }, edit).reviewType).toBeUndefined();
    expect(formProblems({ ...v, reviewType: 'MANUALLY_REVIEWED' }, edit).reviewType).toBeUndefined();
  });

  it('does not force a reason on a stored Needs review that never had one', () => {
    const original = stored({ reviewType: 'NEEDS_REVIEW', reviewReasons: [] });
    expect(reasonsMissing(valuesFromTransaction(original), original)).toBe(false);
    expect(reasonsMissing(valuesFromTransaction(original), stored({ reviewType: 'AUTO_REVIEWED' }))).toBe(true);
  });
});

describe('buildRequest', () => {
  const base = { isUpdate: false, categoryIds: ['c1'], supportsCards: true };

  it('maps an Add: signed amount, no review fields', () => {
    const body = buildRequest(filled({ description: 'Chai', mcc: '5411', cardId: 'card1', instantDiscount: '10', channel: 'UPI' }), base);
    expect(body).toMatchObject({
      accountId: 'a1',
      cardId: 'card1',
      amount: -250,
      date: '2026-10-13',
      description: 'Chai',
      categoryIds: ['c1'],
      mcc: '5411',
      rewardDetails: { instantDiscount: 10, channel: 'UPI', settlementDate: null },
    });
    expect(body).not.toHaveProperty('reviewType');
    expect(body).not.toHaveProperty('reviewReasons');
  });

  it('sends no card for Unattributed or an account that takes none', () => {
    expect(buildRequest(filled(), base).cardId).toBeNull();
    expect(buildRequest(filled({ cardId: 'card1' }), { ...base, supportsCards: false }).cardId).toBeNull();
  });

  it('sends review type and the ticked reasons on an Edit of Needs review', () => {
    const body = buildRequest(filled({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED', 'DUPLICATE_SUSPECT'] }), {
      ...base,
      isUpdate: true,
      source: 'gmail_statement',
    });
    expect(body).toMatchObject({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED', 'DUPLICATE_SUSPECT'], source: 'gmail_statement' });
  });

  it('omits reasons for any other review type, and when none is ticked', () => {
    const edit = { ...base, isUpdate: true };
    expect(buildRequest(filled({ reviewType: 'MANUALLY_REVIEWED', reviewReasons: ['UNRECONCILED'] }), edit)).not.toHaveProperty('reviewReasons');
    const none = buildRequest(filled({ reviewType: 'NEEDS_REVIEW', reviewReasons: [] }), edit);
    expect(none.reviewType).toBe('NEEDS_REVIEW');
    expect(none).not.toHaveProperty('reviewReasons');
  });

  it('keeps the monitoring reason only while monitoring, and clears a removed MCC on Edit', () => {
    expect(buildRequest(filled({ monitored: false, monitoringReason: 'x' }), base).monitoringReason).toBeUndefined();
    expect(buildRequest(filled({ monitored: true, monitoringReason: 'x' }), base).monitoringReason).toBe('x');
    expect(buildRequest(filled({ mcc: '' }), { ...base, isUpdate: true }).mcc).toBe('');
  });
});
