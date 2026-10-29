import { describe, expect, it } from 'vitest';

import type { CounterpartyResponse, CounterpartySelection } from '@/lib/lending.types';

import { buildCreateLendingRequest, entriesLabel, lendingEntryProblem, positionLabel } from './lendingEntryFormModel';

const rahul: CounterpartyResponse = {
  id: 'p1',
  name: 'Rahul Sharma',
  entryCount: 2, linkedEntryCount: 0,
  netPosition: 1200,
  repaidByYou: 0,
  repaidToYou: 0,
  totalBorrowed: 0,
  totalLent: 1200,
};
const existing: CounterpartySelection = { kind: 'existing', counterparty: rahul };

describe('lendingEntryProblem', () => {
  it('needs a person first, then a positive amount', () => {
    expect(lendingEntryProblem(null, '100')).toEqual({ field: 'party', message: 'Pick a person' });
    expect(lendingEntryProblem(existing, '')).toEqual({ field: 'amount', message: 'Amount must be greater than zero' });
    expect(lendingEntryProblem(existing, '0')).toEqual({ field: 'amount', message: 'Amount must be greater than zero' });
    expect(lendingEntryProblem(existing, '100')).toBeNull();
    expect(lendingEntryProblem({ kind: 'new', name: 'Asha' }, '0.5')).toBeNull();
  });

  it('rejects an amount that is not a finite number (an unresolved expression)', () => {
    for (const bad of ['100/0', '5+', '100-200', '1.2.3']) {
      expect(lendingEntryProblem(existing, bad)).toEqual({ field: 'amount', message: 'Amount must be greater than zero' });
    }
  });
});

describe('buildCreateLendingRequest', () => {
  const base = { entryType: 'lent' as const, amount: '5000', entryDate: '2026-10-21', expectedReturnDate: '', notes: '  dinner  ' };

  it('sends an existing person by id and a new one by name', () => {
    expect(buildCreateLendingRequest({ ...base, party: existing })).toMatchObject({
      counterpartyId: 'p1',
      direction: 'lent',
      kind: 'principal',
      amount: 5000,
      entryDate: '2026-10-21',
      notes: 'dinner',
      expectedReturnDate: undefined,
    });
    const created = buildCreateLendingRequest({ ...base, party: { kind: 'new', name: 'Asha' } });
    expect(created.newCounterpartyName).toBe('Asha');
    expect(created.counterpartyId).toBeUndefined();
  });

  it('maps each entry type to direction and kind, and carries the expected date and transaction', () => {
    expect(buildCreateLendingRequest({ ...base, party: existing, entryType: 'repaid_to_me' })).toMatchObject({
      direction: 'borrowed',
      kind: 'settlement',
    });
    expect(
      buildCreateLendingRequest({ ...base, party: existing, expectedReturnDate: '2026-11-01', transactionId: 't1' }),
    ).toMatchObject({ expectedReturnDate: '2026-11-01', transactionId: 't1' });
    expect(buildCreateLendingRequest({ ...base, party: existing, notes: '  ' }).notes).toBeUndefined();
  });
});

describe('labels', () => {
  it('positionLabel words the balance', () => {
    expect(positionLabel(rahul)).toBe('Owes you ₹1,200');
    expect(positionLabel({ ...rahul, netPosition: -500 })).toBe('You owe ₹500');
    expect(positionLabel({ ...rahul, netPosition: 0 })).toBe('Settled');
    expect(positionLabel({ ...rahul, entryCount: 0, linkedEntryCount: 0, netPosition: 0 })).toBe('No entries yet');
  });

  it('entriesLabel pluralises', () => {
    expect(entriesLabel(1)).toBe('1 entry');
    expect(entriesLabel(3)).toBe('3 entries');
  });
});
