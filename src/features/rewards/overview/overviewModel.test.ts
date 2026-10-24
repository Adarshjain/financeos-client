import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildOverview, capLeftText, type CardTotal, earnedText, labelLines, nextMilestoneText, yearLines } from './overviewModel';

// Ranges drop the year of the current one, so the clock is fixed.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-13T06:00:00Z'));
});
afterAll(() => vi.useRealTimers());

const total = (accountId: string, over: Partial<CardTotal> = {}): CardTotal => ({
  accountId,
  from: '2026-03-15',
  to: '2027-03-14',
  calendarYearFallback: false,
  points: 0,
  grossValueInr: 0,
  ...over,
});

describe('earnedText', () => {
  it('shows rupees, rupees plus points, or points alone', () => {
    expect(earnedText(1502, 0)).toBe('₹1,502');
    expect(earnedText(1502, 1040)).toBe('₹1,502 + 1,040 pts');
    expect(earnedText(0, 1040)).toBe('1,040 pts');
    expect(earnedText(0, 0)).toBe('₹0');
  });
});

describe('buildOverview', () => {
  const cards = [
    { id: 'a', name: 'HDFC Regalia', last4: '7741', bank: 'hdfc' },
    { id: 'b', name: 'Amex Platinum', last4: '1005', bank: null },
    { id: 'c', name: 'SBI Cashback' },
  ];
  const totals = [
    total('a', { grossValueInr: 1090, points: 2180 }),
    total('b', { grossValueInr: 0, points: 1040 }),
    total('c', { grossValueInr: 412, calendarYearFallback: true, from: '2026-01-01', to: '2026-12-31' }),
  ];

  it('sorts cards by earned, highest first', () => {
    expect(buildOverview(cards, totals, new Set()).cards.map((c) => c.id)).toEqual(['a', 'c', 'b']);
  });

  it('adds up each card over its own year and keeps unvalued points beside the rupees', () => {
    const m = buildOverview(cards, totals, new Set(['b']));
    expect(m.total).toBe('₹1,502 + 1,040 pts');
    expect(m.cards.map((c) => [c.id, c.earned, c.needsPointValue])).toEqual([
      ['a', '₹1,090', false],
      ['c', '₹412', false],
      ['b', '1,040 pts', true],
    ]);
  });

  it('counts valued points only through the rupees', () => {
    expect(buildOverview(cards, totals, new Set()).total).toBe('₹1,502');
  });

  it('breaks a tie on points, then on name', () => {
    const tied = [
      { id: 'x', name: 'Zed' },
      { id: 'y', name: 'Alpha' },
      { id: 'z', name: 'Mid' },
    ];
    const t = [total('x', { points: 10 }), total('y'), total('z', { points: 50 })];
    expect(buildOverview(tied, t, new Set(['x', 'z'])).cards.map((c) => c.id)).toEqual(['z', 'x', 'y']);
    expect(buildOverview(tied, [], new Set()).cards.map((c) => c.id)).toEqual(['y', 'z', 'x']);
  });

  it('writes the card line: the bank display name and last four, then the reward year; links the card and its rules', () => {
    const [a, c] = buildOverview(cards, totals, new Set()).cards;
    expect(a).toMatchObject({
      bankId: 'hdfc',
      identity: 'HDFC Bank · ••7741',
      year: 'Anniversary year 15 Mar 26 – 14 Mar 27',
      subtitle: 'HDFC Bank · ••7741 · Anniversary year 15 Mar 26 – 14 Mar 27',
      href: '/ds/rewards/cards/a',
      setValueHref: '/ds/rewards/rules?account=a',
    });
    expect(c).toMatchObject({ bankId: null, identity: '', year: 'Calendar year 1 Jan – 31 Dec' });
    expect(c.subtitle).toBe('Calendar year 1 Jan – 31 Dec');
  });

  it('shows a bank the app does not know as it came, and a card with no last four by its bank alone', () => {
    const [x, y] = buildOverview(
      [
        { id: 'x', name: 'X', bank: 'zzbank', last4: '1111' },
        { id: 'y', name: 'Y', bank: 'sbi' },
      ],
      [],
      new Set()
    ).cards;
    expect(x.identity).toBe('zzbank · ••1111');
    expect(y).toMatchObject({ identity: 'State Bank of India', year: '', subtitle: 'State Bank of India' });
  });

  it('is empty without cards', () => {
    expect(buildOverview([], totals, new Set())).toEqual({ total: '₹0', cards: [] });
  });

  it('counts the points milestones paid as earned points, as the card page does', () => {
    const m = buildOverview(
      cards,
      [total('a', { grossValueInr: 0, points: 400, milestonePoints: 600 })],
      new Set(['a'])
    );
    expect(m.cards[0]).toMatchObject({ id: 'a', earned: '1,000 pts', needsPointValue: true });
    expect(m.total).toBe('1,000 pts');
  });
});

describe('capLeftText', () => {
  const cap = { label: 'Dining', used: 400, cap: 500, unit: 'RUPEES' as const, windowEnd: '2026-10-31' };
  it('says what is left of the cap, in rupees or points', () => {
    expect(capLeftText(cap)).toBe('₹100 left of ₹500 · Dining');
    expect(capLeftText({ ...cap, label: 'Fuel', used: 380, cap: 500, unit: 'POINTS' })).toBe('120 pts left of 500 pts · Fuel');
    expect(capLeftText({ ...cap, cap: 150000, used: 0 })).toBe('₹1.5L left of ₹1.5L · Dining');
  });
  it('reads ₹0 left once the cap is used up, even past it', () => {
    expect(capLeftText({ ...cap, used: 500 })).toBe('₹0 left · Dining');
    expect(capLeftText({ ...cap, used: 620 })).toBe('₹0 left · Dining');
  });
  it('is a dash without a cap', () => {
    expect(capLeftText(null)).toBe('—');
    expect(capLeftText(undefined)).toBe('—');
  });
});

describe('nextMilestoneText', () => {
  const spend = { name: 'Annual spend', progress: 280000, threshold: 400000, basis: 'SPEND' as const, windowEnd: '2027-03-14' };
  it('says what is to go: rupees for a spend target, a count for transactions', () => {
    expect(nextMilestoneText({ ...spend, progress: 280000, threshold: 400000 }, null)).toBe('₹1.2L to go · Annual spend');
    expect(nextMilestoneText({ ...spend, progress: 3500, threshold: 4000 }, null)).toBe('₹500 to go · Annual spend');
    expect(nextMilestoneText({ name: 'Ten swipes', progress: 7, threshold: 10, basis: 'COUNT', windowEnd: '2026-10-31' }, null)).toBe(
      '3 more · Ten swipes'
    );
  });
  it('prefers the open milestone over the last met one', () => {
    expect(nextMilestoneText(spend, { name: 'Old', achievedOn: '2026-09-02' })).toBe('₹1.2L to go · Annual spend');
  });
  it('shows the month of the last met one when none is open, else a dash', () => {
    expect(nextMilestoneText(null, { name: 'Fee waiver', achievedOn: '2026-10-09' })).toBe('Met · Oct');
    expect(nextMilestoneText(null, null)).toBe('—');
  });
});

describe('buildOverview: cap and milestone columns', () => {
  it('fills them from the totals row, and dashes a card with neither', () => {
    const [a, b] = buildOverview(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      [
        total('a', {
          grossValueInr: 10,
          nearestCap: { label: 'Dining', used: 400, cap: 500, unit: 'RUPEES', windowEnd: '2026-10-31' },
          nextMilestone: { name: 'Annual spend', progress: 280000, threshold: 400000, basis: 'SPEND', windowEnd: '2027-03-14' },
        }),
        total('b'),
      ],
      new Set()
    ).cards;
    expect([a.capLeft, a.nextMilestone]).toEqual(['₹100 left of ₹500 · Dining', '₹1.2L to go · Annual spend']);
    expect([b.capLeft, b.nextMilestone]).toEqual(['—', '—']);
  });
});

describe('table cell lines', () => {
  it('puts the figure over its label, and keeps label-less text on one line', () => {
    expect(labelLines('₹100 left of ₹500 · Dining 5%')).toEqual({ main: '₹100 left of ₹500', sub: 'Dining 5%' });
    expect(labelLines('Met · Oct')).toEqual({ main: 'Met', sub: 'Oct' });
    expect(labelLines('—')).toEqual({ main: '—', sub: null });
  });

  it('puts the reward year range over its kind', () => {
    expect(yearLines('Anniversary year 15 Jul 26 – 14 Jul 27')).toEqual({ main: '15 Jul 26 – 14 Jul 27', sub: 'Anniversary year' });
    expect(yearLines('Calendar year 1 Jan – 31 Dec')).toEqual({ main: '1 Jan – 31 Dec', sub: 'Calendar year' });
    expect(yearLines('')).toEqual({ main: '', sub: null });
  });
});
