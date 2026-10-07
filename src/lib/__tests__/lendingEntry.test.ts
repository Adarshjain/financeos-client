import { describe, expect, it } from 'vitest';

import {
  directionOf,
  ENTRY_TYPE_LABEL,
  ENTRY_TYPE_SHORT,
  entryTypesForDirection,
  fromEntryType,
  isSettlementType,
  LENDING_ENTRY_TYPES,
  settlementWarning,
  settleUpEntry,
  suggestedEntryType,
  toEntryType,
} from '../lendingEntry';

describe('lendingEntry — (direction, kind) <-> entry type', () => {
  it('round-trips every entry type', () => {
    for (const type of LENDING_ENTRY_TYPES) {
      const { direction, kind } = fromEntryType(type);
      expect(toEntryType(direction, kind)).toBe(type);
      expect(ENTRY_TYPE_LABEL[type]).toBeTruthy();
      expect(ENTRY_TYPE_SHORT[type]).toBeTruthy();
    }
  });

  it('maps settlements onto the money direction', () => {
    expect(fromEntryType('repaid_by_me')).toEqual({ direction: 'lent', kind: 'settlement' });
    expect(fromEntryType('repaid_to_me')).toEqual({ direction: 'borrowed', kind: 'settlement' });
    expect(fromEntryType('lent')).toEqual({ direction: 'lent', kind: 'principal' });
    expect(fromEntryType('borrowed')).toEqual({ direction: 'borrowed', kind: 'principal' });
  });

  it('treats a missing kind as principal', () => {
    expect(toEntryType('lent', undefined)).toBe('lent');
    expect(toEntryType('borrowed', undefined)).toBe('borrowed');
  });

  it('exposes direction and settlement-ness', () => {
    expect(directionOf('repaid_to_me')).toBe('borrowed');
    expect(directionOf('repaid_by_me')).toBe('lent');
    expect(isSettlementType('repaid_to_me')).toBe(true);
    expect(isSettlementType('lent')).toBe(false);
  });

  it('lists the two types per direction', () => {
    expect(entryTypesForDirection('lent')).toEqual(['lent', 'repaid_by_me']);
    expect(entryTypesForDirection('borrowed')).toEqual(['borrowed', 'repaid_to_me']);
  });
});

describe('suggestedEntryType', () => {
  it('prefers clearing an existing balance over new debt', () => {
    expect(suggestedEntryType('borrowed', 1200)).toBe('repaid_to_me'); // they owe you, money came in
    expect(suggestedEntryType('lent', -800)).toBe('repaid_by_me'); // you owe them, money went out
  });

  it('falls back to principal when the balance is not in the clearing direction', () => {
    expect(suggestedEntryType('borrowed', 0)).toBe('borrowed');
    expect(suggestedEntryType('borrowed', -500)).toBe('borrowed');
    expect(suggestedEntryType('lent', 0)).toBe('lent');
    expect(suggestedEntryType('lent', 900)).toBe('lent');
  });
});

describe('settlementWarning', () => {
  it('is silent for principal entries and empty amounts', () => {
    expect(settlementWarning('lent', 500, 0, 'Rahul')).toBeNull();
    expect(settlementWarning('borrowed', 500, 100, 'Rahul')).toBeNull();
    expect(settlementWarning('repaid_to_me', 0, 100, 'Rahul')).toBeNull();
    expect(settlementWarning('repaid_to_me', NaN, 100, 'Rahul')).toBeNull();
  });

  it('they paid me back: warns when nothing is owed or more than owed, silent within the balance', () => {
    expect(settlementWarning('repaid_to_me', 100, 0, 'Rahul')).toBe("Rahul doesn't owe you anything right now.");
    expect(settlementWarning('repaid_to_me', 100, -50, 'Rahul')).toBe("Rahul doesn't owe you anything right now.");
    expect(settlementWarning('repaid_to_me', 1500, 1200, 'Rahul')).toBe(
      "That's more than the ₹1,200.00 Rahul owes you.",
    );
    expect(settlementWarning('repaid_to_me', 1200, 1200, 'Rahul')).toBeNull();
    expect(settlementWarning('repaid_to_me', 300, 1200, 'Rahul')).toBeNull();
  });

  it('I paid back: warns when you owe nothing or more than you owe, silent within the balance', () => {
    expect(settlementWarning('repaid_by_me', 100, 0, 'Priya')).toBe("You don't owe Priya anything right now.");
    expect(settlementWarning('repaid_by_me', 100, 50, 'Priya')).toBe("You don't owe Priya anything right now.");
    expect(settlementWarning('repaid_by_me', 900, -800, 'Priya')).toBe(
      "That's more than the ₹800.00 you owe Priya.",
    );
    expect(settlementWarning('repaid_by_me', 800, -800, 'Priya')).toBeNull();
  });
});

describe('settleUpEntry', () => {
  it('zeroes a positive balance with a repayment received', () => {
    expect(settleUpEntry(2500)).toEqual({ entryType: 'repaid_to_me', amount: 2500 });
  });

  it('zeroes a negative balance with a repayment made', () => {
    expect(settleUpEntry(-640)).toEqual({ entryType: 'repaid_by_me', amount: 640 });
  });

  it('is null when already settled', () => {
    expect(settleUpEntry(0)).toBeNull();
  });
});
