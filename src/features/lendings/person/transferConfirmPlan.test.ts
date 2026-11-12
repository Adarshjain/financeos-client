import { describe, expect, it } from 'vitest';

import type { TransferRow } from '@/features/lendings/list/lendingsListModel';

import { leftOutNote, transferConfirmPlan } from './personModel';

const row = (lendingId: string, transactionId: string): TransferRow => ({
  key: `${lendingId}:${transactionId}`,
  lendingId,
  transactionId,
  personName: 'Sam',
  entryLabel: '29 Aug',
  title: `IMPS · ${transactionId}`,
  subtitle: '13 Sep · Savings',
});

describe('transferConfirmPlan', () => {
  it('picks one transfer per entry, none twice, and counts what competes', () => {
    const plan = transferConfirmPlan([row('e1', 't1'), row('e1', 't2'), row('e2', 't1'), row('e3', 't3')]);
    expect(plan.picks.map((r) => r.key)).toEqual(['e1:t1', 'e3:t3']);
    expect(plan.leftOut).toBe(2);
  });

  it('has nothing left out when every row is its own pair', () => {
    const plan = transferConfirmPlan([row('e1', 't1'), row('e2', 't2')]);
    expect(plan).toMatchObject({ leftOut: 0 });
    expect(plan.picks).toHaveLength(2);
  });
});

describe('leftOutNote', () => {
  it('reads one and many', () => {
    expect(leftOutNote(1)).toContain('1 suggestion is left out');
    expect(leftOutNote(2)).toContain('2 suggestions are left out');
  });
});
