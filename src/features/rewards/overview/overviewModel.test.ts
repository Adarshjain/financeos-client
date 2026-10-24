import { describe, expect, it } from 'vitest';

import { buildOverview, type CardTotal, earnedText } from './overviewModel';

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
    { id: 'a', name: 'HDFC Regalia', last4: '7741', bank: 'HDFC' },
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

  it('writes the card line: last four, bank and the reward year, and links the card and its rules', () => {
    const [a, c] = buildOverview(cards, totals, new Set()).cards;
    expect(a).toMatchObject({
      subtitle: '••7741 · HDFC · anniversary year 15 Mar → 14 Mar',
      href: '/ds/rewards/cards/a',
      setValueHref: '/ds/rewards/rules?account=a',
    });
    expect(c.subtitle).toBe('calendar year 1 Jan → 31 Dec');
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
