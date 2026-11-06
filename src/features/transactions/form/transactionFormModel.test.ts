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
    reviewReasons: ['UNRECONCILED'],
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

  it('fills Edit from the stored transaction, with the sign as a direction', () => {
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
      amount: 'Enter an amount above ₹0.',
      date: 'Pick a date.',
      accountId: 'Select an account.',
    });
    expect(formProblems(filled({ amount: '' }), ctx).amount).toBeDefined();
  });

  it('says to add an account when there is none to pick', () => {
    expect(formProblems(filled({ accountId: '' }), { ...ctx, selectableAccounts: [] }).accountId).toBe(
      'Add an account to save this transaction.',
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
  const base = { isUpdate: false, tagIds: ['c1'], supportsCards: true };

  it('maps an Add: signed amount, no review fields', () => {
    const body = buildRequest(filled({ description: 'Chai', mcc: '5411', cardId: 'card1', instantDiscount: '10', channel: 'UPI' }), base);
    expect(body).toMatchObject({
      accountId: 'a1',
      cardId: 'card1',
      amount: -250,
      date: '2026-10-13',
      description: 'Chai',
      tagIds: ['c1'],
      mcc: '5411',
      rewardDetails: { instantDiscount: 10, channel: 'UPI', settlementDate: null },
    });
    expect(body).not.toHaveProperty('reviewType');
    expect(body).not.toHaveProperty('reviewReasons');
  });

  it('sends the category and sub-category key it is given, and no sub for Others', () => {
    const picked = buildRequest(filled(), { ...base, category: { categoryKey: 'food', subcategoryKey: 'food.delivery' } });
    expect(picked).toMatchObject({ categoryKey: 'food', subcategoryKey: 'food.delivery' });
    const others = buildRequest(filled(), { ...base, category: { categoryKey: 'food', subcategoryKey: null } });
    expect(others.categoryKey).toBe('food');
    expect(others).not.toHaveProperty('subcategoryKey');
  });

  it('sends no category when none is given: an edit never re-categorises', () => {
    expect(buildRequest(filled(), { ...base, isUpdate: true })).not.toHaveProperty('categoryKey');
    expect(buildRequest(filled(), { ...base, isUpdate: true, category: null })).not.toHaveProperty('categoryKey');
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

describe('a transaction with no stored amount', () => {
  const foreign = () => stored({ amount: null, originalAmount: -20, originalCurrency: 'USD' });

  it('opens the form with an empty amount and the direction of the original', () => {
    expect(valuesFromTransaction(foreign()).amount).toBe('');
    expect(valuesFromTransaction(foreign()).direction).toBe('debit');
    expect(valuesFromTransaction(stored({ amount: null, originalAmount: 20, originalCurrency: 'USD' })).direction).toBe('credit');
  });

  it('may stay empty on Edit, but not on Add', () => {
    const values = { ...valuesFromTransaction(foreign()), reviewReasons: ['UNRECONCILED' as const] };
    expect(formProblems(values, { isUpdate: true, original: foreign(), selectableAccounts: accounts }).amount).toBeUndefined();
    expect(formProblems({ ...values, amount: '' }, { isUpdate: false, selectableAccounts: accounts }).amount).toBeDefined();
  });

  it('still needs an amount on Edit when one is stored', () => {
    const values = { ...valuesFromTransaction(stored()), amount: '' };
    expect(formProblems(values, { isUpdate: true, original: stored(), selectableAccounts: accounts }).amount).toBeDefined();
  });

  it('sends a null amount for an empty field', () => {
    const values = valuesFromTransaction(foreign());
    expect(buildRequest(values, { isUpdate: true, tagIds: [], supportsCards: false }).amount).toBeNull();
  });
});

describe('reasons a person cannot edit', () => {
  it('is not offered on the form', () => {
    const values = valuesFromTransaction(stored({ reviewReasons: ['NOT_ON_STATEMENT', 'DUPLICATE_SUSPECT'] }));
    expect(values.reviewReasons).toEqual(['DUPLICATE_SUSPECT']);
  });

  it('stays on the row when another reason is ticked', () => {
    const values = { ...valuesFromTransaction(stored()), reviewType: 'NEEDS_REVIEW' as const, reviewReasons: ['DUPLICATE_SUSPECT' as const] };
    const body = buildRequest(values, {
      isUpdate: true,
      tagIds: [],
      supportsCards: false,
      storedReasons: ['NOT_ON_STATEMENT', 'UNRECONCILED'],
    });
    expect(body.reviewReasons).toEqual(['DUPLICATE_SUSPECT', 'NOT_ON_STATEMENT']);
  });
});
