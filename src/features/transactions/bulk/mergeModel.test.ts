import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

import { computeDefaultKeepId, mergeChecks, mergeSourceLabel, mergeWarning } from './mergeModel';

const txn = (over: Partial<Transaction>): Transaction =>
  ({ id: 'a', accountId: 'a1', date: '2026-10-11', amount: -1249, source: 'manual', createdAt: '2026-10-11T10:00:00Z', ...over }) as Transaction;

describe('computeDefaultKeepId', () => {
  it.each([
    ['gmail_statement', 'file_upload'],
    ['file_upload', 'gmail_transaction_alert'],
    ['gmail_transaction_alert', 'manual'],
  ] as const)('keeps %s over %s, whichever comes first', (better, worse) => {
    const good = txn({ id: 'good', source: better });
    const bad = txn({ id: 'bad', source: worse });
    expect(computeDefaultKeepId(good, bad)).toBe('good');
    expect(computeDefaultKeepId(bad, good)).toBe('good');
  });

  it('keeps the older one on a tie', () => {
    const old = txn({ id: 'old', createdAt: '2026-10-10T00:00:00Z' });
    const young = txn({ id: 'young', createdAt: '2026-10-12T00:00:00Z' });
    expect(computeDefaultKeepId(young, old)).toBe('old');
  });
});

describe('mergeChecks and mergeWarning', () => {
  const names: [string, string] = ['HDFC Regalia', 'SBI Cashback'];

  it('is clean for the same account, direction and amount', () => {
    const checks = mergeChecks(txn({}), txn({ id: 'b' }));
    expect(checks).toEqual({ differentAccount: false, directionMismatch: false, amountMismatch: false });
    expect(mergeWarning(checks, names)).toBeNull();
  });

  it('blocks on a different account and names both, ahead of the other warnings', () => {
    const checks = mergeChecks(txn({}), txn({ id: 'b', accountId: 'a2', amount: 10 }));
    const w = mergeWarning(checks, names);
    expect(w?.kind).toBe('blocked');
    expect(w?.text).toContain('HDFC Regalia vs SBI Cashback');
  });

  it('warns on opposite directions, then on different amounts', () => {
    expect(mergeWarning(mergeChecks(txn({}), txn({ id: 'b', amount: 1249 })), names)?.kind).toBe('direction');
    const amount = mergeWarning(mergeChecks(txn({}), txn({ id: 'b', amount: -1250 })), names);
    expect(amount).toMatchObject({ kind: 'amount', title: 'Amount Mismatch' });
  });
});

describe('mergeSourceLabel', () => {
  it("uses the board's words", () => {
    expect(mergeSourceLabel('gmail_statement')).toBe('Statement');
    expect(mergeSourceLabel('gmail_transaction_alert')).toBe('Gmail alert');
    expect(mergeSourceLabel('file_upload')).toBe('Upload');
    expect(mergeSourceLabel('manual')).toBe('Manual');
  });
});
