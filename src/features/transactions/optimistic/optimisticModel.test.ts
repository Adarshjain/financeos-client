import { describe, expect, it } from 'vitest';

import { transactionRows } from '@/features/transactions/list/transactionRowsModel';
import type { Transaction } from '@/lib/transaction.types';

import { emptyValues, valuesFromTransaction } from '../form/transactionFormModel';
import { applyChanges, approveChange, mergeOntoLatest, patchChange, patchFromValues, removeChange } from './optimisticModel';

const t = (over: Partial<Transaction>): Transaction =>
  ({ id: 't1', accountId: 'a1', date: '2026-10-12', amount: -100, description: 'A', source: 'manual', reviewType: 'MANUALLY_REVIEWED', createdAt: '', ...over }) as Transaction;

const server = [
  t({ id: 'one', reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] }),
  t({ id: 'two', reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED', 'CATEGORY_UNVERIFIED'] }),
  t({ id: 'three' }),
];
const rows = transactionRows(server, { accounts: null, showSource: false });
const ctx = { accounts: null, query: { review: null, reason: null, accounts: [] as string[] } };

describe('applyChanges', () => {
  it('is null with no changes', () => {
    expect(applyChanges(server, rows, [], ctx)).toBeNull();
  });

  it('approve with every reason cleared marks the row reviewed and lowers the count; some left keeps it flagged', () => {
    const all = applyChanges(server, rows, [approveChange(['one'], ['DUPLICATE_SUSPECT'])], ctx)!;
    expect(all.transactions[0]).toMatchObject({ reviewType: 'MANUALLY_REVIEWED', reviewReasons: [] });
    expect(all.needsReviewDelta).toBe(-1);
    const some = applyChanges(server, rows, [approveChange(['two'], ['UNRECONCILED'])], ctx)!;
    expect(some.transactions[1]).toMatchObject({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['CATEGORY_UNVERIFIED'] });
    expect(some.needsReviewDelta).toBe(0);
  });

  it('approve leaves the list only under the Needs review filter', () => {
    const change = [approveChange(['one'], ['DUPLICATE_SUSPECT'])];
    expect(applyChanges(server, rows, change, ctx)!.rows.map((r) => r.id)).toEqual(['one', 'two', 'three']);
    const filtered = applyChanges(server, rows, change, { accounts: null, query: { ...ctx.query, review: 'NEEDS_REVIEW' as const } })!;
    expect(filtered.rows.map((r) => r.id)).toEqual(['two', 'three']);
    expect(filtered.gone).toBe(1);
  });

  it('remove takes the row out of the list and the count but keeps the transaction for an open detail', () => {
    const v = applyChanges(server, rows, [removeChange(['one'])], ctx)!;
    expect(v.rows.map((r) => r.id)).toEqual(['two', 'three']);
    expect(v.transactions.map((x) => x.id)).toEqual(['one', 'two', 'three']);
    expect(v.gone).toBe(1);
    expect(v.needsReviewDelta).toBe(-1);
  });

  it('patch redraws that row only and applies changes in order', () => {
    const v = applyChanges(server, rows, [patchChange('three', { description: 'B' }), patchChange('three', { description: 'C' })], ctx)!;
    expect(v.rows[2].description).toBe('C');
    expect(v.rows[0]).toBe(rows[0]);
    expect(v.transactions[0]).toBe(server[0]);
  });
});

describe('filters other than Needs review', () => {
  const q = (over: object) => ({ accounts: null, query: { ...ctx.query, ...over } });
  it('a row approved under the Manually reviewed filter that was not in it stays out of the way; an edit that leaves the filter hides it', () => {
    const edit = [patchChange('three', { reviewType: 'NEEDS_REVIEW' })];
    expect(applyChanges(server, rows, edit, q({ review: 'MANUALLY_REVIEWED' }))!.rows.map((r) => r.id)).toEqual(['one', 'two']);
    expect(applyChanges(server, rows, edit, q({ review: 'NEEDS_REVIEW' }))!.rows.map((r) => r.id)).toEqual(['one', 'two', 'three']);
  });
  it('hides a row moved to an account outside the account filter', () => {
    const move = [patchChange('three', { accountId: 'a9' })];
    expect(applyChanges(server, rows, move, q({ accounts: ['a1'] }))!.rows.map((r) => r.id)).toEqual(['one', 'two']);
    expect(applyChanges(server, rows, move, q({ accounts: ['a1', 'a9'] }))!.rows).toHaveLength(3);
  });
  it('hides a row whose reason was cleared under the reason filter', () => {
    const v = applyChanges(server, rows, [approveChange(['two'], ['UNRECONCILED'])], q({ reason: 'UNRECONCILED' }))!;
    expect(v.rows.map((r) => r.id)).toEqual(['one', 'three']);
  });
});

describe('mergeOntoLatest', () => {
  it('keeps what the person changed and takes the rest from the latest row', () => {
    const opened = server[0];
    const latest = { ...opened, reviewType: 'MANUALLY_REVIEWED' as const, reviewReasons: [] };
    const values = { ...valuesFromTransaction(opened), description: 'New' };
    expect(mergeOntoLatest(values, opened, latest)).toMatchObject({ description: 'New', reviewType: 'MANUALLY_REVIEWED', reviewReasons: [] });
  });
});

describe('patchFromValues', () => {
  it('has only the fields the form changed, and no card on an account without cards', () => {
    const original = t({ cardId: 'k1' });
    const values = { ...valuesFromTransaction(original), description: 'Z' };
    expect(patchFromValues(values, [], original, true)).toEqual({ description: 'Z' });
    expect(patchFromValues({ ...values, accountId: 'a2', cardId: 'k1' }, [], original, false)).toMatchObject({ accountId: 'a2', cardId: null });
  });

  it('turns the form into the stored shape, only what differs from the stored row (an unchanged day keeps its date)', () => {
    const original = t({ date: '2026-10-12T05:30:00' });
    const values = { ...emptyValues('2026-10-21', 'a2'), amount: '50', date: '2026-10-12', description: 'Chai', reviewType: 'NEEDS_REVIEW' as const, reviewReasons: ['UNRECONCILED' as const] };
    expect(patchFromValues(values, [{ id: 'c1', name: 'Tea' }] as never, original, true)).toMatchObject({
      amount: -50,
      accountId: 'a2',
      description: 'Chai',
      categories: [{ id: 'c1', name: 'Tea' }],
      reviewType: 'NEEDS_REVIEW',
      reviewReasons: ['UNRECONCILED'],
    });
    expect(patchFromValues(values, [], original, true)).not.toHaveProperty('date');
  });
});
