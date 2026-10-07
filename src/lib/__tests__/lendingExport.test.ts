import { describe, expect, it } from 'vitest';

import {
  balancePhrase,
  buildLendingLedgerText,
  DEFAULT_LENDING_EXPORT_TOGGLES,
  derivedOpeningBalance,
  directionLabels,
  entryPhrase,
  type ExportableEntry,
  headerLine,
  type LendingExportOptions,
  sinceLastSettledIds,
} from '@/lib/lendingExport';
import { formatDate } from '@/lib/utils';

const d = formatDate;
const TODAY = '2026-10-07';

function entry(
  id: string,
  entryDate: string,
  direction: 'lent' | 'borrowed',
  kind: 'principal' | 'settlement',
  amount: number,
  runningBalance: number,
  extra: Partial<ExportableEntry> = {},
): ExportableEntry {
  return { id, entryDate, direction, kind, amount, runningBalance, ...extra };
}

/** The plan's sample ledger: a settled first cycle, then an open one. */
const LEDGER: ExportableEntry[] = [
  entry('l1', '2025-11-12', 'lent', 'principal', 3000, 3000, { notes: 'Concert tickets' }),
  entry('l2', '2025-11-20', 'borrowed', 'settlement', 3000, 0),
  entry('l3', '2026-01-05', 'lent', 'principal', 5000, 5000, { notes: 'Dinner at Toit, split 50/50' }),
  entry('l4', '2026-01-18', 'borrowed', 'settlement', 2000, 3000),
  entry('l5', '2026-02-02', 'borrowed', 'principal', 1200, 1800, { notes: 'Cab to airport' }),
  entry('l6', '2026-03-14', 'lent', 'principal', 8500, 10300, { notes: 'Goa flights', expectedReturnDate: '2026-04-30' }),
  entry('l7', '2026-10-01', 'borrowed', 'settlement', 4000, 6300),
];

const ids = (...xs: string[]) => new Set(xs);
const ALL = new Set(LEDGER.map((e) => e.id));

function opts(over: Partial<LendingExportOptions> = {}): LendingExportOptions {
  return {
    ...DEFAULT_LENDING_EXPORT_TOGGLES,
    myName: 'Adarsh',
    theirName: 'Rahul',
    openingBalance: null,
    ...over,
  };
}

function build(selected: ReadonlySet<string>, over: Partial<LendingExportOptions> = {}) {
  return buildLendingLedgerText({ entries: LEDGER, selectedIds: selected, today: TODAY, options: opts(over) });
}

describe('buildLendingLedgerText — golden samples', () => {
  it('names, derived opening balance, notes + totals on (plan §5 sample 1)', () => {
    const selected = ids('l4', 'l5', 'l6', 'l7');
    const text = build(selected, { openingBalance: derivedOpeningBalance(LEDGER, selected) });

    expect(text).toBe(
      [
        'Lending ledger · Adarsh & Rahul',
        `As of ${d(TODAY)} · Entries from ${d('2026-01-18')} to ${d('2026-10-01')}`,
        '',
        'Opening balance: Rahul owes Adarsh ₹5,000.00',
        '',
        `1. ${d('2026-01-18')} · Rahul repaid Adarsh · ₹2,000.00`,
        `2. ${d('2026-02-02')} · Rahul lent Adarsh · ₹1,200.00`,
        '   Cab to airport',
        `3. ${d('2026-03-14')} · Adarsh lent Rahul · ₹8,500.00`,
        '   Goa flights',
        `4. ${d('2026-10-01')} · Rahul repaid Adarsh · ₹4,000.00`,
        '',
        'Totals',
        'Adarsh lent Rahul: ₹8,500.00',
        'Rahul lent Adarsh: ₹1,200.00',
        'Rahul repaid Adarsh: ₹6,000.00',
        '',
        'Closing balance: Rahul owes Adarsh ₹6,300.00',
      ].join('\n'),
    );
  });

  it('both names blank, expected-return + running balance on (plan §5 sample 2)', () => {
    const selected = ids('l4', 'l5', 'l6', 'l7');
    const text = build(selected, {
      myName: null,
      theirName: null,
      openingBalance: 5000,
      includeExpectedReturn: true,
      includeRunningBalance: true,
    });

    expect(text).toBe(
      [
        'Lending ledger',
        `As of ${d(TODAY)} · Entries from ${d('2026-01-18')} to ${d('2026-10-01')}`,
        '',
        'Opening balance: you owe me ₹5,000.00',
        '',
        `1. ${d('2026-01-18')} · You repaid me · ₹2,000.00`,
        '   Balance: you owe me ₹3,000.00',
        `2. ${d('2026-02-02')} · You lent me · ₹1,200.00`,
        '   Cab to airport',
        '   Balance: you owe me ₹1,800.00',
        `3. ${d('2026-03-14')} · I lent you · ₹8,500.00`,
        `   Goa flights · expected back by ${d('2026-04-30')}`,
        '   Balance: you owe me ₹10,300.00',
        `4. ${d('2026-10-01')} · You repaid me · ₹4,000.00`,
        '   Balance: you owe me ₹6,300.00',
        '',
        'Totals',
        'I lent you: ₹8,500.00',
        'You lent me: ₹1,200.00',
        'You repaid me: ₹6,000.00',
        '',
        'Closing balance: you owe me ₹6,300.00',
      ].join('\n'),
    );
  });

  it('since-last-settled selection prints a zero opening balance as settled and closes on the overall balance', () => {
    const selected = sinceLastSettledIds(LEDGER);
    const text = build(selected, { openingBalance: derivedOpeningBalance(LEDGER, selected) });

    expect(selected).toEqual(ids('l3', 'l4', 'l5', 'l6', 'l7'));
    expect(text).toContain('Opening balance: ₹0.00 (settled)');
    expect(text).toContain('Closing balance: Rahul owes Adarsh ₹6,300.00');
  });
});

describe('buildLendingLedgerText — header and period', () => {
  it('names both ways, one name, or none', () => {
    expect(headerLine('Adarsh', 'Rahul')).toBe('Lending ledger · Adarsh & Rahul');
    expect(headerLine('Adarsh', null)).toBe('Lending ledger with Adarsh');
    expect(headerLine(null, 'Rahul')).toBe('Lending ledger with Rahul');
    expect(headerLine(null, null)).toBe('Lending ledger');
    expect(headerLine('  Adarsh ', '   ')).toBe('Lending ledger with Adarsh');
  });

  it('labels the entry date range, and omits it for a single entry', () => {
    expect(build(ids('l3', 'l7'))).toContain(`As of ${d(TODAY)} · Entries from ${d('2026-01-05')} to ${d('2026-10-01')}\n`);
    expect(build(ids('l3'))).toContain(`As of ${d(TODAY)}\n`);
    expect(build(ids('l3'))).not.toContain('Entries from');
  });

  it('omits the range when every selected entry shares a date', () => {
    const sameDay = [
      entry('a', '2026-05-01', 'lent', 'principal', 100, 100),
      entry('b', '2026-05-01', 'lent', 'principal', 50, 150),
    ];
    const text = buildLendingLedgerText({ entries: sameDay, selectedIds: ids('a', 'b'), today: TODAY, options: opts() });
    expect(text.split('\n')[1]).toBe(`As of ${d(TODAY)}`);
  });

  it('never prints today twice when the only entries are dated today', () => {
    const todayOnly = [entry('a', TODAY, 'lent', 'principal', 100, 100)];
    const text = buildLendingLedgerText({ entries: todayOnly, selectedIds: ids('a'), today: TODAY, options: opts() });
    expect(text.split('\n')[1]).toBe(`As of ${d(TODAY)}`);
    expect(text.split('\n')[1].match(new RegExp(d(TODAY), 'g'))).toHaveLength(1);
  });

  it('never prints an entry count, a bank transaction or an account', () => {
    const text = build(ids('l3', 'l4'), { openingBalance: 0 });
    expect(text).not.toMatch(/\d+ of \d+/);
    expect(text).not.toMatch(/transaction|account/i);
  });

  it('says so when nothing is selected', () => {
    expect(build(new Set())).toBe(`Lending ledger · Adarsh & Rahul\nAs of ${d(TODAY)}\n\nNo entries selected.`);
  });
});

describe('entryPhrase — four entry types × name combinations', () => {
  it('both names', () => {
    expect(entryPhrase('lent', 'Adarsh', 'Rahul')).toBe('Adarsh lent Rahul');
    expect(entryPhrase('borrowed', 'Adarsh', 'Rahul')).toBe('Rahul lent Adarsh');
    expect(entryPhrase('repaid_by_me', 'Adarsh', 'Rahul')).toBe('Adarsh repaid Rahul');
    expect(entryPhrase('repaid_to_me', 'Adarsh', 'Rahul')).toBe('Rahul repaid Adarsh');
  });

  it('my name blank → I / me', () => {
    expect(entryPhrase('lent', null, 'Rahul')).toBe('I lent Rahul');
    expect(entryPhrase('borrowed', null, 'Rahul')).toBe('Rahul lent me');
    expect(entryPhrase('repaid_by_me', null, 'Rahul')).toBe('I repaid Rahul');
    expect(entryPhrase('repaid_to_me', null, 'Rahul')).toBe('Rahul repaid me');
  });

  it('their name blank → you', () => {
    expect(entryPhrase('lent', 'Adarsh', null)).toBe('Adarsh lent you');
    expect(entryPhrase('borrowed', 'Adarsh', null)).toBe('You lent Adarsh');
    expect(entryPhrase('repaid_by_me', 'Adarsh', null)).toBe('Adarsh repaid you');
    expect(entryPhrase('repaid_to_me', 'Adarsh', null)).toBe('You repaid Adarsh');
  });

  it('both blank → I / you', () => {
    expect(entryPhrase('lent', null, null)).toBe('I lent you');
    expect(entryPhrase('borrowed', null, null)).toBe('You lent me');
    expect(entryPhrase('repaid_by_me', null, null)).toBe('I repaid you');
    expect(entryPhrase('repaid_to_me', null, null)).toBe('You repaid me');
  });

  it('trims names and treats whitespace as blank', () => {
    expect(entryPhrase('lent', '  Adarsh ', '  ')).toBe('Adarsh lent you');
  });
});

describe('balancePhrase and directionLabels', () => {
  it('positive = they owe me, negative = I owe them, with owe/owes agreement', () => {
    expect(balancePhrase(6300, 'Adarsh', 'Rahul')).toBe('Rahul owes Adarsh ₹6,300.00');
    expect(balancePhrase(-6300, 'Adarsh', 'Rahul')).toBe('Adarsh owes Rahul ₹6,300.00');
    expect(balancePhrase(10, null, null)).toBe('you owe me ₹10.00');
    expect(balancePhrase(-10, null, null)).toBe('I owe you ₹10.00');
    expect(balancePhrase(10, null, 'Rahul')).toBe('Rahul owes me ₹10.00');
    expect(balancePhrase(-10, null, 'Rahul')).toBe('I owe Rahul ₹10.00');
    expect(balancePhrase(10, 'Adarsh', null)).toBe('you owe Adarsh ₹10.00');
    expect(balancePhrase(-10, 'Adarsh', null)).toBe('Adarsh owes you ₹10.00');
  });

  it('treats anything inside the tolerance as settled', () => {
    expect(balancePhrase(0, 'Adarsh', 'Rahul')).toBe('₹0.00 (settled)');
    expect(balancePhrase(0.004, null, null)).toBe('₹0.00 (settled)');
    expect(balancePhrase(-1e-13, null, null)).toBe('₹0.00 (settled)');
    expect(balancePhrase(0.01, null, null)).toBe('you owe me ₹0.01');
  });

  it('direction labels are the two sentence-case owes phrases', () => {
    expect(directionLabels('Adarsh', 'Rahul')).toEqual({ theyOwe: 'Rahul owes Adarsh', iOwe: 'Adarsh owes Rahul' });
    expect(directionLabels(null, null)).toEqual({ theyOwe: 'You owe me', iOwe: 'I owe you' });
  });
});

describe('buildLendingLedgerText — opening and closing balance', () => {
  it('positive and negative opening balances carry into the closing balance', () => {
    const plus = build(ids('l5'), { openingBalance: 3000 });
    expect(plus).toContain('Opening balance: Rahul owes Adarsh ₹3,000.00');
    expect(plus).toContain('Closing balance: Rahul owes Adarsh ₹1,800.00');

    const minus = build(ids('l5'), { openingBalance: -500 });
    expect(minus).toContain('Opening balance: Adarsh owes Rahul ₹500.00');
    expect(minus).toContain('Closing balance: Adarsh owes Rahul ₹1,700.00');
  });

  it('a zero opening balance prints as settled', () => {
    expect(build(ids('l3'), { openingBalance: 0 })).toContain('Opening balance: ₹0.00 (settled)');
  });

  it('no opening balance → no opening line and a net-of-listed-entries footer', () => {
    const text = build(ids('l4', 'l5', 'l6', 'l7'));
    expect(text).not.toContain('Opening balance');
    expect(text).not.toContain('Closing balance');
    expect(text).toContain('Net of listed entries: Rahul owes Adarsh ₹1,300.00');
  });

  it('a selection that nets to zero closes as settled', () => {
    expect(build(ids('l1', 'l2'))).toContain('Net of listed entries: ₹0.00 (settled)');
    expect(build(ids('l1', 'l2'), { openingBalance: 0 })).toContain('Closing balance: ₹0.00 (settled)');
  });

  it('running balances restart from the opening balance (or zero) at the first selected entry', () => {
    const fromOpening = build(ids('l5', 'l6'), { openingBalance: 100, includeRunningBalance: true });
    expect(fromOpening).toContain('   Balance: Adarsh owes Rahul ₹1,100.00');
    expect(fromOpening).toContain('   Balance: Rahul owes Adarsh ₹7,400.00');

    const fromZero = build(ids('l5', 'l6'), { includeRunningBalance: true });
    expect(fromZero).toContain('   Balance: Adarsh owes Rahul ₹1,200.00');
    expect(fromZero).toContain('   Balance: Rahul owes Adarsh ₹7,300.00');
  });
});

describe('derivedOpeningBalance', () => {
  it('is zero when the first entry is selected or nothing is', () => {
    expect(derivedOpeningBalance(LEDGER, ALL)).toBe(0);
    expect(derivedOpeningBalance(LEDGER, new Set())).toBe(0);
  });

  it("is the predecessor's running balance for a later start, even for a non-contiguous selection", () => {
    expect(derivedOpeningBalance(LEDGER, ids('l4', 'l5', 'l6', 'l7'))).toBe(5000);
    expect(derivedOpeningBalance(LEDGER, ids('l3', 'l7'))).toBe(0);
    expect(derivedOpeningBalance(LEDGER, ids('l6'))).toBe(1800);
    expect(derivedOpeningBalance(LEDGER, ids('l5', 'l7'))).toBe(3000);
  });

  it('rounds float noise to paise and normalises negative zero', () => {
    const noisy = [
      entry('a', '2026-01-01', 'lent', 'principal', 0.1, 0.1),
      entry('b', '2026-01-02', 'lent', 'principal', 0.2, 0.1 + 0.2),
      entry('c', '2026-01-03', 'lent', 'principal', 1, 1.3),
      entry('d', '2026-01-04', 'borrowed', 'settlement', 1.3, -1e-13),
      entry('e', '2026-01-05', 'lent', 'principal', 1, 1),
    ];
    expect(derivedOpeningBalance(noisy, ids('c'))).toBe(0.3);
    expect(Object.is(derivedOpeningBalance(noisy, ids('e')), 0)).toBe(true);
  });
});

describe('buildLendingLedgerText — notes, expected return, running balance, totals', () => {
  it('notes toggle', () => {
    expect(build(ids('l3'))).toContain('   Dinner at Toit, split 50/50');
    expect(build(ids('l3'), { includeNotes: false })).not.toContain('Dinner at Toit');
  });

  it('whitespace-only notes are treated as none', () => {
    const blank = [entry('a', '2026-01-01', 'lent', 'principal', 100, 100, { notes: '   ' })];
    const text = buildLendingLedgerText({ entries: blank, selectedIds: ids('a'), today: TODAY, options: opts() });
    expect(text.split('\n').filter((l) => l.startsWith('   '))).toHaveLength(0);
  });

  it('expected return: off by default, joined to the notes with a separator when on', () => {
    expect(build(ids('l6'))).not.toContain('expected back');
    expect(build(ids('l6'), { includeExpectedReturn: true })).toContain(`   Goa flights · expected back by ${d('2026-04-30')}`);
  });

  it('expected return on its own line when there are no notes, and never for a settlement', () => {
    const rows = [
      entry('p', '2026-01-01', 'lent', 'principal', 100, 100, { expectedReturnDate: '2026-02-01' }),
      entry('s', '2026-01-10', 'borrowed', 'settlement', 100, 0, { expectedReturnDate: '2026-02-01' }),
    ];
    const text = buildLendingLedgerText({
      entries: rows,
      selectedIds: ids('p', 's'),
      today: TODAY,
      options: opts({ includeExpectedReturn: true }),
    });
    const lines = text.split('\n');
    expect(lines[lines.indexOf(`1. ${d('2026-01-01')} · Adarsh lent Rahul · ₹100.00`) + 1]).toBe(
      `   expected back by ${d('2026-02-01')}`,
    );
    expect(text.match(/expected back/g)).toHaveLength(1);
  });

  it('running balance toggle', () => {
    expect(build(ids('l3', 'l4'))).not.toContain('Balance:');
    const on = build(ids('l3', 'l4'), { includeRunningBalance: true });
    expect(on).toContain('   Balance: Rahul owes Adarsh ₹5,000.00');
    expect(on).toContain('   Balance: Rahul owes Adarsh ₹3,000.00');
  });

  it('totals omit zero lines, keep the fixed order, and skip single entries or when off', () => {
    const text = build(ids('l3', 'l4'));
    expect(text).toContain('\nTotals\nAdarsh lent Rahul: ₹5,000.00\nRahul repaid Adarsh: ₹2,000.00\n');
    expect(text).not.toContain('Rahul lent Adarsh:');
    expect(text).not.toContain('Adarsh repaid Rahul:');

    expect(build(ids('l3'))).not.toContain('Totals');
    expect(build(ids('l3', 'l4'), { includeTotals: false })).not.toContain('Totals');
  });

  it('totals include a repaid-by-me line when I paid back', () => {
    const rows = [
      entry('b', '2026-01-01', 'borrowed', 'principal', 400, -400),
      entry('r', '2026-01-05', 'lent', 'settlement', 400, 0),
    ];
    const text = buildLendingLedgerText({ entries: rows, selectedIds: ids('b', 'r'), today: TODAY, options: opts() });
    expect(text).toContain('Rahul lent Adarsh: ₹400.00\nAdarsh repaid Rahul: ₹400.00');
  });
});

describe('sinceLastSettledIds', () => {
  it('returns everything when the balance never hit zero', () => {
    const open = LEDGER.slice(2);
    expect(sinceLastSettledIds(open)).toEqual(ids('l3', 'l4', 'l5', 'l6', 'l7'));
  });

  it('returns the tail after the last zero when the ledger is currently open', () => {
    expect(sinceLastSettledIds(LEDGER)).toEqual(ids('l3', 'l4', 'l5', 'l6', 'l7'));
  });

  it('returns the just-settled cycle when the ledger is square right now', () => {
    const square = [...LEDGER, entry('l8', '2026-10-05', 'borrowed', 'settlement', 6300, 0)];
    expect(sinceLastSettledIds(square)).toEqual(ids('l3', 'l4', 'l5', 'l6', 'l7', 'l8'));
  });

  it('returns everything when the only zero is the final entry', () => {
    expect(sinceLastSettledIds(LEDGER.slice(0, 2))).toEqual(ids('l1', 'l2'));
  });

  it('treats float noise as zero and handles an empty ledger', () => {
    const noisy = [
      entry('a', '2026-01-01', 'lent', 'principal', 0.3, 0.3),
      entry('b', '2026-01-02', 'borrowed', 'settlement', 0.3, 5e-17),
      entry('c', '2026-01-03', 'lent', 'principal', 1, 1),
    ];
    expect(sinceLastSettledIds(noisy)).toEqual(ids('c'));
    expect(sinceLastSettledIds([])).toEqual(new Set());
  });
});
