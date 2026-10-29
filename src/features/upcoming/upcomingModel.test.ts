import { describe, expect, it } from 'vitest';

import type { ObligationItem } from './obligationsModel';
import {
  buildTiles,
  foldedMonthLine,
  parseKind,
  parseMonths,
  rowAmount,
  rowDate,
  rowSubtitleParts,
  upcomingSearch,
} from './upcomingModel';

const TODAY = '2026-10-13';
const it_ = (o: Partial<ObligationItem>): ObligationItem =>
  ({ type: 'emi', status: 'upcoming', date: '2026-10-25', amount: 100, ...o }) as ObligationItem;

const overdueEmi = it_({ status: 'overdue', date: '2026-10-05', amount: 36603 });
const overdueStmt = it_({ type: 'statement_expected', status: 'overdue', date: '2026-10-03', amount: null });
const bill = it_({ type: 'card_bill', status: 'due_soon', date: '2026-10-15', amount: 33900, statementId: 'S1' });
const rahul = it_({
  type: 'lending_due',
  direction: 'lent',
  date: '2026-10-28',
  amount: 15000,
  counterpartyName: 'Rahul Sharma',
  counterpartyId: 'C1',
});
const priya = it_({
  type: 'lending_due',
  direction: 'borrowed',
  date: '2026-10-23',
  amount: 12000,
  counterpartyName: 'Priya Nair',
  counterpartyId: 'C2',
});
const nextMonth = it_({ date: '2026-11-05', amount: 500 });
const ALL = [overdueEmi, overdueStmt, bill, rahul, priya, nextMonth];

describe('buildTiles', () => {
  it('all four tiles with their figures, in order, and a caption only on Due back', () => {
    const tiles = buildTiles(ALL, TODAY);
    expect(tiles.map((t) => t.id)).toEqual(['overdue', 'next7', 'month', 'dueBack']);
    expect(tiles[0]).toMatchObject({ value: '₹36,603', tone: 'danger' });
    expect(tiles[0].caption).toBeUndefined();
    expect(tiles[1]).toMatchObject({ value: '₹33,900' });
    expect(tiles[1].caption).toBeUndefined();
    // this month: bill + rahul + priya (overdue and next month excluded)
    expect(tiles[2]).toMatchObject({ value: '₹60,900' });
    expect(tiles[3]).toMatchObject({ value: '+₹15,000', tone: 'positive', caption: 'Rahul · 28 Oct' });
  });

  it('Due back counts only money owed to you; several people read "n people · next <date>"', () => {
    const other = it_({ type: 'lending_due', direction: 'lent', date: '2026-10-20', amount: 1000, counterpartyName: 'Asha K' });
    const tile = buildTiles([rahul, other, priya], TODAY).find((t) => t.id === 'dueBack')!;
    expect(tile).toMatchObject({ value: '+₹16,000', caption: '2 people · next 20 Oct' });
  });

  it('hides a tile with nothing in it', () => {
    expect(buildTiles([priya], TODAY).map((t) => t.id)).toEqual(['month']);
    expect(buildTiles([], TODAY)).toEqual([]);
  });

  it('follows the filter: EMIs only drops Next 7 days and Due back', () => {
    const emis = [...ALL, it_({ date: '2026-10-25' })].filter((i) => i.type === 'emi');
    expect(buildTiles(emis, TODAY).map((t) => t.id)).toEqual(['overdue', 'month']);
  });

  it('sums only rows that carry an amount, in whole rupees', () => {
    const tiles = buildTiles([it_({ date: '2026-10-14', amount: 10.5 }), it_({ date: '2026-10-14', amount: null })], TODAY);
    expect(tiles.find((t) => t.id === 'next7')).toMatchObject({ value: '₹11' });
  });
});


describe('page state', () => {
  it('parses kind and months, falling back to the defaults', () => {
    expect(parseKind('emi')).toBe('emi');
    expect(parseKind('bogus')).toBe('all');
    expect(parseKind(null)).toBe('all');
    expect(parseMonths('6')).toBe(6);
    expect(parseMonths('7')).toBe(3);
    expect(parseMonths(undefined)).toBe(3);
  });

  it('omits defaults from the query string and keeps other params', () => {
    expect(upcomingSearch('', { kind: 'all', months: 3 })).toBe('');
    expect(upcomingSearch('?bill=S1', { kind: 'emi', months: 6 })).toBe('?bill=S1&kind=emi&months=6');
    expect(upcomingSearch('?kind=emi&months=6', { kind: 'all', months: 3 })).toBe('');
  });
});

describe('row model', () => {
  it('amount tones: danger when overdue, "+" green when owed to you, dash when none, plain otherwise', () => {
    expect(rowAmount(overdueEmi)).toEqual({ text: '₹36,603.00', tone: 'danger' });
    expect(rowAmount(rahul)).toEqual({ text: '+₹15,000.00', tone: 'positive' });
    expect(rowAmount(priya)).toEqual({ text: '₹12,000.00', tone: 'ink' });
    expect(rowAmount(overdueStmt)).toEqual({ text: '—', tone: 'none' });
  });

  it('date tile parts, null when undated', () => {
    expect(rowDate(bill)).toEqual({ day: 15, monthLabel: 'OCT' });
    expect(rowDate(it_({ date: null }))).toBeNull();
  });

  it('subtitle: days then account; undated says the date is unknown', () => {
    const days = (d: number) => `in ${d} days`;
    expect(rowSubtitleParts(it_({ daysUntil: 2, accountName: 'Amex' }), days)).toEqual(['in 2 days', 'Amex']);
    expect(rowSubtitleParts(it_({ date: null, daysUntil: null }), days)).toEqual(['Due date unknown']);
  });

  it('folded month line with and without a total', () => {
    expect(foldedMonthLine('December 2026', [nextMonth, nextMonth])).toBe('December · 2 · ₹1,000');
    expect(foldedMonthLine('December 2026', [overdueStmt])).toBe('December · 1');
  });
});
