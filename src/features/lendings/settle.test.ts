import { describe, expect, it } from 'vitest';

import {
  firstNameOf,
  halfOf,
  netPositionOf,
  settleBalanceLine,
  settleEntryType,
  settleSegmentOptions,
} from './settle';

describe('settle model', () => {
  it('maps direction and segment to the ledger entry type', () => {
    expect(settleEntryType('lent', 'settle')).toBe('repaid_to_me');
    expect(settleEntryType('lent', 'more')).toBe('lent');
    expect(settleEntryType('borrowed', 'settle')).toBe('repaid_by_me');
    expect(settleEntryType('borrowed', 'more')).toBe('borrowed');
  });

  it('labels the segments for each direction', () => {
    expect(settleSegmentOptions('lent').map((o) => o.label)).toEqual(['Received', 'Lent more']);
    expect(settleSegmentOptions('borrowed').map((o) => o.label)).toEqual(['Paid', 'Borrowed more']);
  });

  it('signs the balance: positive when they owe you', () => {
    expect(netPositionOf('lent', 100)).toBe(100);
    expect(netPositionOf('borrowed', 100)).toBe(-100);
  });

  it('balance line names whose favour it is', () => {
    expect(settleBalanceLine('lent', 12000, 'Priya')).toBe('Balance ₹12,000 in your favour');
    expect(settleBalanceLine('borrowed', 12000, 'Priya')).toBe("Balance ₹12,000 in Priya's favour");
  });

  it('first name and half', () => {
    expect(firstNameOf('Rahul Sharma')).toBe('Rahul');
    expect(halfOf(12000)).toBe(6000);
    expect(halfOf(101)).toBe(50.5);
  });
});
