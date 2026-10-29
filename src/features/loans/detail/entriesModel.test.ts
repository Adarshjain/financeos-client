import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { deleteEntryCopy, entriesCount, entryRows } from './entriesModel';
import { chargeFixture, eventFixture } from './loanDetail.fixtures';

pinClock();

describe('entryRows', () => {
  const events = [
    eventFixture({ id: 'e1' }),
    eventFixture({ id: 'e2', eventType: 'rate_change', effectiveDate: '2026-08-01', amount: null, newAnnualRatePct: 8.25, adjustmentMode: 'reduce_emi' }),
    eventFixture({ id: 'e3', eventType: 'foreclosure', effectiveDate: '2026-12-01', amount: 100, adjustmentMode: null }),
  ];
  const charges = [
    chargeFixture({ id: 'c1', chargeDate: '2025-08-01' }),
    chargeFixture({ id: 'c2', chargeType: 'processing_fee', amount: 11800, chargeDate: '2025-09-01', notes: null }),
  ];

  it('lists events newest first, then charges newest first', () => {
    expect(entryRows(events, charges).map((r) => r.id)).toEqual(['e3', 'e2', 'e1', 'c2', 'c1']);
  });

  it('draws an event as the board does', () => {
    const rows = entryRows(events, charges);
    expect(rows.find((r) => r.id === 'e2')).toMatchObject({
      title: 'Rate change · 8.25%',
      subtitle: '1 Aug · reduce EMI',
      amount: null,
    });
    expect(rows.find((r) => r.id === 'e1')).toMatchObject({
      title: 'Prepayment',
      subtitle: '1 Jun · reduce tenure',
      amount: '₹2,00,000',
    });
    expect(rows.find((r) => r.id === 'e3')).toMatchObject({ title: 'Foreclosure', subtitle: '1 Dec', amount: '₹100' });
  });

  it('draws a charge with its note', () => {
    const rows = entryRows(events, charges);
    expect(rows.find((r) => r.id === 'c1')).toMatchObject({
      title: 'Insurance premium',
      subtitle: '1 Aug 2025 · SBI Life RiNn Raksha',
      amount: '₹24,500',
    });
    expect(rows.find((r) => r.id === 'c2')?.subtitle).toBe('1 Sep 2025');
  });

  it('counts the entries in words', () => {
    expect(entriesCount(0)).toBe('No entries yet');
    expect(entriesCount(1)).toBe('1 entry');
    expect(entriesCount(4)).toBe('4 entries');
  });
});

describe('deleteEntryCopy', () => {
  it('says what an event delete takes and what stays', () => {
    const [row] = entryRows([eventFixture({ id: 'e1' })], []);
    const copy = deleteEntryCopy(row);
    expect(copy.title).toBe('Delete event?');
    expect(copy.description).toBe('Prepayment, 1 Jun · reduce tenure goes.');
    expect(copy.impact).toContain('The schedule is calculated again without it.');
    expect(copy.impact.join(' ')).toContain('A linked bank transaction stays');
  });

  it('says what a charge delete takes and what stays', () => {
    const [row] = entryRows([], [chargeFixture()]);
    const copy = deleteEntryCopy(row);
    expect(copy.title).toBe('Delete charge?');
    expect(copy.description).toBe('Insurance premium of ₹24,500, 1 Aug 2025 · SBI Life RiNn Raksha goes.');
    expect(copy.impact.join(' ')).toContain('A linked bank transaction stays');
  });
});
