import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import {
  deleteEntryCopy,
  deletePersonCopy,
  entryWord,
  inDays,
  ledgerRow,
  ledgerRows,
  linkedLine,
  parseOpenExport,
  parsePersonUrl,
  personHeader,
  personHero,
  personHref,
  personUrl,
  sinceText,
  totalsLine,
} from './personModel';
import { entriesFixture, entryFixture, personFixture } from './personModel.fixtures';

pinClock();

const TODAY = '2026-10-13';

describe('URL state', () => {
  it('parses defaults and rejects junk', () => {
    expect(parsePersonUrl({})).toEqual({ page: 0, size: 25 });
    expect(parsePersonUrl({ page: '3', size: '50' })).toEqual({ page: 2, size: 50 });
    expect(parsePersonUrl({ page: '-1', size: '10' })).toEqual({ page: 0, size: 25 });
    expect(parsePersonUrl({ page: 'x' })).toEqual({ page: 0, size: 25 });
  });

  it('opens Export ledger only for ?export=1', () => {
    expect(parseOpenExport({ export: '1' })).toBe(true);
    expect(parseOpenExport({ export: ['1', '0'] })).toBe(true);
    expect(parseOpenExport({ export: '0' })).toBe(false);
    expect(parseOpenExport({})).toBe(false);
  });

  it('builds the person URL on the Dinero page with defaults left out', () => {
    expect(personHref('p1')).toBe('/loans/lendings/p1');
    expect(personUrl('p1', { page: 0, size: 25 })).toBe('/loans/lendings/p1');
    expect(personUrl('p1', { page: 2, size: 50 })).toBe('/loans/lendings/p1?page=3&size=50');
  });
});

describe('personHeader', () => {
  it('shows the notes and when the money is expected', () => {
    const h = personHeader(personFixture(), TODAY);
    expect(h).toEqual({
      info: 'College friend',
      context: 'expected 28 Oct · in 15 days',
    });
  });

  it('says "due", not "expected", when you owe them', () => {
    const h = personHeader(personFixture({ netPosition: -2500, expectedReturnDate: '2026-10-12' }), TODAY);
    expect(h.context).toBe('due 12 Oct · 1 day overdue');
  });

  it('has no expected line once the balance is zero', () => {
    const h = personHeader(personFixture({ netPosition: 0 }), TODAY);
    expect(h.context).toBeNull();
  });

  it('copes with a person without entries or notes', () => {
    const h = personHeader(personFixture({ entryCount: 0, notes: null, netPosition: 0, expectedReturnDate: null }), TODAY);
    expect(h.info).toBeNull();
    expect(personHeader(personFixture({ entryCount: 1, notes: ' ' }), TODAY).info).toBeNull();
  });

  it('counts days in words', () => {
    expect(inDays(0)).toBe('today');
    expect(inDays(1)).toBe('in 1 day');
    expect(inDays(-3)).toBe('3 days overdue');
  });
});

describe('personHero', () => {
  const hero = (over = {}) => personHero(personFixture(over));

  it('shows only the net position: "Owed to you" in green when they owe you', () => {
    expect(hero()).toEqual({ label: 'Owed to you', value: '₹15,000', tone: 'positive', figures: [] });
  });

  it('shows "You owe" in red, as a positive figure, when the balance is yours to pay', () => {
    expect(hero({ netPosition: -2500 })).toEqual({ label: 'You owe', value: '₹2,500', tone: 'danger', figures: [] });
  });

  it('reads Settled with zero, plain, when even', () => {
    expect(hero({ netPosition: 0 })).toEqual({ label: 'Settled', value: '₹0', tone: undefined, figures: [] });
  });
});

describe('ledgerRow', () => {
  const rows = ledgerRows(entriesFixture());

  it('puts a repayment in Received, with a Linked badge flag and its transaction on the phone line', () => {
    expect(rows[0]).toMatchObject({
      id: 'e3',
      date: '10 Oct',
      title: 'Part repayment',
      linked: true,
      settled: false,
      lent: null,
      received: '+10,000.00',
      balance: '15,000.00',
      sub: '10 Oct · received ₹10,000.00 · UPI from Rahul Sharma',
    });
  });

  it('puts principal in Lent and adds the expected return to the phone line', () => {
    expect(rows[1]).toMatchObject({
      linked: false,
      lent: '25,000.00',
      received: null,
      sub: '29 Aug · lent ₹25,000.00 · expected 28 Oct',
    });
  });

  it('flags the entry that brought the balance to zero, and falls back to the type without a note', () => {
    expect(rows[2]).toMatchObject({ settled: true, balance: '0.00', title: 'They repaid', sub: '9 May · received ₹1,800.00' });
  });

  it('shows a negative balance with a minus sign and a repayment you made as "paid"', () => {
    const row = ledgerRow(entryFixture({ direction: 'lent', kind: 'settlement', amount: 500, runningBalance: -500, notes: null }));
    expect(row).toMatchObject({ balance: '−500.00', title: 'You repaid', lent: '500.00' });
    expect(row.sub).toContain('paid ₹500.00');
  });

  it('words principal as lent / borrowed and repayments as received / paid', () => {
    expect(entryWord('lent', 'principal')).toBe('lent');
    expect(entryWord('borrowed', 'principal')).toBe('borrowed');
    expect(entryWord('borrowed', 'settlement')).toBe('received');
    expect(entryWord('lent', 'settlement')).toBe('paid');
  });

  it('does not show an expected return on a repayment', () => {
    const row = ledgerRow(entryFixture({ kind: 'settlement', direction: 'borrowed', expectedReturnDate: '2026-10-28' }));
    expect(row.sub).not.toContain('expected');
  });
});

describe('totals, linked count, since', () => {
  it('writes the totals line', () => {
    expect(totalsLine({ lent: 26800, received: 11800, closing: 15000 })).toBe(
      'Opening ₹0 · lent ₹26,800 · received ₹11,800 · closing ₹15,000',
    );
  });

  it('counts the linked entries', () => {
    expect(linkedLine(4, 1)).toBe('1 of 4 entries');
    expect(linkedLine(0, 0)).toBe('0 of 0 entries');
  });

  it('reads Since as month and year', () => {
    expect(sinceText('2026-05-02')).toBe('May 2026');
    expect(sinceText(null)).toBeNull();
  });
});

describe('confirm copy', () => {
  it('names the entry and what stays', () => {
    const copy = deleteEntryCopy(entriesFixture()[0]);
    expect(copy.description).toBe('This repayment entry of ₹10,000 goes.');
    expect(copy.impact).toEqual([
      'The entry leaves the ledger and the balance is worked out again.',
      'The bank transaction stays; only its link to this entry goes.',
    ]);
    expect(deleteEntryCopy(entriesFixture()[1])).toMatchObject({ description: 'This lent entry of ₹25,000 goes.' });
    expect(deleteEntryCopy(entriesFixture()[1]).impact).toHaveLength(1);
  });

  it('says the whole ledger goes when a person is deleted', () => {
    const copy = deletePersonCopy(personFixture());
    expect(copy.description).toBe('Rahul Sharma goes.');
    expect(copy.impact[0]).toBe('Their whole ledger goes (3 entries).');
    expect(copy.impact[1]).toContain('Bank transactions stay');
  });
});
