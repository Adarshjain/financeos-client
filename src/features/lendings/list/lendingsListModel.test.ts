import { describe, expect, it } from 'vitest';

import type { CounterpartyListItem, CounterpartyMatchSuggestions, CounterpartySummary } from '@/lib/lending.types';
import type { Transaction } from '@/lib/transaction.types';
import { pinClock } from '@/test/pinClock';

import {
  avatarToneFor,
  directionFor,
  dueIn,
  expectedText,
  lastEntryText,
  lendingRow,
  lendingsHero,
  lendingsUrl,
  parseLendingsUrl,
  phoneSubText,
  sideOf,
  transferRows,
} from './lendingsListModel';

pinClock();

const TODAY = '2026-10-13';

function person(over: Partial<CounterpartyListItem> = {}): CounterpartyListItem {
  return {
    id: 'p1',
    name: 'Rahul Sharma',
    notes: null,
    entryCount: 2, linkedEntryCount: 0,
    netPosition: 15000,
    repaidByYou: 0,
    repaidToYou: 10000,
    totalBorrowed: 0,
    totalLent: 25000,
    lastEntryDate: '2026-10-10',
    lastEntryType: 'borrowed',
    lastEntryKind: 'settlement',
    lastEntryAmount: 10000,
    expectedReturnDate: '2026-10-28',
    ...over,
  };
}

describe('URL state', () => {
  it('parses defaults and rejects junk', () => {
    expect(parseLendingsUrl({})).toEqual({ q: '', filter: 'all', page: 0, size: 25 });
    expect(parseLendingsUrl({ q: ' pri ', filter: 'owe', page: '3', size: '50' })).toEqual({
      q: 'pri',
      filter: 'owe',
      page: 2,
      size: 50,
    });
    expect(parseLendingsUrl({ filter: 'bogus', page: '-1', size: '10' })).toEqual({ q: '', filter: 'all', page: 0, size: 25 });
  });

  it('builds the tab URL with only non-default parts', () => {
    expect(lendingsUrl({ q: '', filter: 'all', page: 0, size: 25 })).toBe('/loans/lendings');
    expect(lendingsUrl({ q: 'pri', filter: 'settled', page: 1, size: 50 })).toBe(
      '/loans/lendings?q=pri&filter=settled&page=2&size=50',
    );
  });

  it('maps each chip to the server direction', () => {
    expect(directionFor('all')).toBeUndefined();
    expect(directionFor('owed')).toBe('OWED_TO_YOU');
    expect(directionFor('owe')).toBe('YOU_OWE');
    expect(directionFor('settled')).toBe('SETTLED');
  });
});

describe('lendingsHero', () => {
  const summary: CounterpartySummary = {
    owedToYou: 19200,
    owedToYouCount: 2,
    youOwe: 112000,
    youOweCount: 2,
    dueThisMonth: { amount: 12000, count: 1, nextName: 'Priya', nextDate: '2026-10-23' },
    expectedBack: { amount: 15000, count: 1, nextName: 'Rahul', nextDate: '2026-10-28' },
  };

  it('puts what is owed net in the hero, red when it is you who owes', () => {
    expect(lendingsHero(summary, 3)).toEqual({
      label: 'Owed to you (net)',
      value: '−₹92,800',
      tone: 'danger',
      figures: [
        { label: 'You owe', value: '₹1,12,000', tone: 'danger', caption: '2 people' },
        { label: 'Settled', value: '3 people' },
      ],
    });
  });

  it('is green when the net is yours and plain at zero, and dashes an unread settled count', () => {
    expect(lendingsHero({ ...summary, youOwe: 0, youOweCount: 0 }, null)).toMatchObject({
      value: '₹19,200',
      tone: 'positive',
      figures: [{ value: '₹0', tone: undefined }, { value: '—' }],
    });
    expect(lendingsHero({ ...summary, owedToYou: 0, youOwe: 0 }, 0).tone).toBeUndefined();
  });
});

describe('expectedText and dueIn', () => {
  it('reads the date and the days left', () => {
    expect(expectedText('2026-10-28', TODAY)).toBe('28 Oct · in 15 d');
    expect(expectedText('2026-10-13', TODAY)).toBe('13 Oct · today');
    expect(expectedText('2026-10-10', TODAY)).toBe('10 Oct · 3 d overdue');
  });

  it('reads "no date" when none is set', () => {
    expect(expectedText(null, TODAY)).toBe('no date');
    expect(expectedText(undefined, TODAY)).toBe('no date');
  });

  it('dueIn words each case', () => {
    expect(dueIn(15)).toBe('in 15 d');
    expect(dueIn(0)).toBe('today');
    expect(dueIn(-1)).toBe('1 d overdue');
  });
});

describe('lastEntryText', () => {
  it('words a repayment while a balance remains as "repaid"', () => {
    expect(lastEntryText(person())).toBe('10 Oct · repaid ₹10,000');
    expect(
      lastEntryText(person({ netPosition: -50000, lastEntryDate: '2026-07-15', lastEntryType: 'lent', lastEntryAmount: 50000 })),
    ).toBe('15 Jul · repaid ₹50,000');
  });

  it('words a repayment that cleared the balance as "settled"', () => {
    expect(
      lastEntryText(person({ netPosition: 0, lastEntryDate: '2026-08-24', lastEntryAmount: 4200 })),
    ).toBe('24 Aug · settled ₹4,200');
  });

  it('words principal entries as lent or borrowed, with no amount', () => {
    expect(lastEntryText(person({ lastEntryKind: 'principal', lastEntryType: 'lent', lastEntryDate: '2026-10-01' }))).toBe('1 Oct · lent');
    expect(lastEntryText(person({ lastEntryKind: 'principal', lastEntryType: 'borrowed', lastEntryDate: '2026-09-23' }))).toBe(
      '23 Sep · borrowed',
    );
  });

  it('is null before any entry', () => {
    expect(lastEntryText(person({ lastEntryDate: null, lastEntryType: null }))).toBeNull();
    expect(lastEntryText(person({ lastEntryDate: undefined, lastEntryType: undefined }))).toBeNull();
  });

  it('omits the amount of a repayment that has none', () => {
    expect(lastEntryText(person({ lastEntryAmount: null }))).toBe('10 Oct · repaid');
  });
});

describe('lendingRow', () => {
  it('draws a person who owes you', () => {
    expect(lendingRow(person(), TODAY)).toMatchObject({
      id: 'p1',
      name: 'Rahul Sharma',
      initials: 'RS',
      side: 'owed',
      directionLabel: 'Owes you',
      directionTone: 'success',
      balance: '+15,000',
      balanceTone: 'positive',
      expected: '28 Oct · in 15 d',
      hasExpected: true,
      lastEntry: '10 Oct · repaid ₹10,000',
      phoneSub: 'expected 28 Oct · last entry 10 Oct',
      href: '/loans/lendings/p1',
    });
  });

  it('draws someone you owe, with the due wording on phone', () => {
    const row = lendingRow(
      person({ id: 'p2', name: 'Priya Nair', netPosition: -12000, expectedReturnDate: '2026-10-23', lastEntryKind: 'principal', lastEntryType: 'borrowed', lastEntryDate: '2026-09-23' }),
      TODAY,
    );
    expect(row).toMatchObject({
      side: 'owe',
      directionLabel: 'You owe',
      directionTone: 'danger',
      balance: '12,000',
      balanceTone: 'danger',
      expected: '23 Oct · in 10 d',
      lastEntry: '23 Sep · borrowed',
      phoneSub: 'due 23 Oct · last entry 23 Sep',
    });
  });

  it('draws a settled person with no date', () => {
    const row = lendingRow(person({ netPosition: 0, expectedReturnDate: null }), TODAY);
    expect(row).toMatchObject({ side: 'settled', directionLabel: 'Settled', directionTone: 'neutral', balance: '0', expected: 'no date', hasExpected: false });
  });

  it('rounds to whole rupees and groups lakhs', () => {
    expect(lendingRow(person({ netPosition: 100000 }), TODAY).balance).toBe('+1,00,000');
    expect(lendingRow(person({ netPosition: -1250.5 }), TODAY).balance).toBe('1,251');
  });

  it('falls back to the notes on phone when there is nothing else to say', () => {
    expect(phoneSubText(person({ expectedReturnDate: null, lastEntryDate: null, notes: 'villa booking' }))).toBe('villa booking');
    expect(phoneSubText(person({ expectedReturnDate: null, lastEntryDate: null, notes: null }))).toBe('');
  });
});

describe('people helpers', () => {
  it('avatarToneFor is stable per name', () => {
    expect(avatarToneFor('Rahul Sharma')).toBe(avatarToneFor('Rahul Sharma'));
    expect(['brand', 'info', 'warning', 'neutral', 'positive']).toContain(avatarToneFor('Priya'));
  });

  it('sideOf follows the sign of the balance', () => {
    expect([sideOf(5), sideOf(-5), sideOf(0)]).toEqual(['owed', 'owe', 'settled']);
  });
});

describe('transferRows', () => {
  const tx = (id: string, over: Partial<Transaction> = {}): Transaction =>
    ({
      id,
      accountId: 'a1',
      date: '2026-09-13',
      amount: 2300,
      description: 'IMPS from Priya Nair',
      source: 'manual',
      createdAt: '',
      ...over,
    }) as Transaction;

  const people: CounterpartyMatchSuggestions[] = [
    {
      counterpartyId: 'p2',
      counterpartyName: 'Priya Nair',
      suggestions: [
        {
          lendingId: 'l1',
          direction: 'borrowed',
          amount: 2300,
          entryDate: '2026-09-12',
          notes: 'split',
          candidates: [tx('t1'), tx('t2', { amount: -2300, description: null, sourcedDescription: 'UPI/42', date: '2026-09-14' })],
        },
        { lendingId: 'l2', direction: 'lent', amount: 10, entryDate: '2026-09-01', candidates: [tx('t3', { accountId: 'unknown' })] },
      ],
    },
  ];

  it('makes one row per (entry, candidate) pair', () => {
    const rows = transferRows(people, new Map([['a1', 'HDFC Savings']]));
    expect(rows.map((r) => r.key)).toEqual(['l1:t1', 'l1:t2', 'l2:t3']);
    expect(rows[0]).toMatchObject({
      lendingId: 'l1',
      transactionId: 't1',
      personName: 'Priya Nair',
      title: 'IMPS from Priya Nair · ₹2,300',
      subtitle: '13 Sep · HDFC Savings · "split"',
    });
  });

  it('uses the bank narration when there is no description, and the absolute amount', () => {
    const rows = transferRows(people, new Map([['a1', 'HDFC Savings']]));
    expect(rows[1].title).toBe('UPI/42 · ₹2,300');
    expect(rows[1].subtitle).toBe('14 Sep · HDFC Savings · "split"');
  });

  it('drops the account and the quoted notes when unknown', () => {
    const rows = transferRows(people, new Map([['a1', 'HDFC Savings']]));
    expect(rows[2].subtitle).toBe('13 Sep');
  });

  it('is empty for no suggestions', () => {
    expect(transferRows([], new Map())).toEqual([]);
  });
});
