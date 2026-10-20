import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { firstNameOf, rupeesExact } from '@/features/lendings/settle';

import {
  DEFAULT_OBLIGATION_MONTHS,
  OBLIGATION_KINDS,
  OBLIGATION_MONTH_OPTIONS,
  type ObligationItem,
  type ObligationKindFilter,
  obligationWindows,
  sumAmounts,
} from './obligations';

export function parseKind(value: string | null | undefined): ObligationKindFilter {
  return OBLIGATION_KINDS.find((k) => k.value === value)?.value ?? 'all';
}

export function parseMonths(value: string | null | undefined): number {
  const n = Number(value);
  return (OBLIGATION_MONTH_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_OBLIGATION_MONTHS;
}

/** The query string for the page state: `kind` and `months` only when not the default; other params stay. */
export function upcomingSearch(
  current: string,
  state: { kind: ObligationKindFilter; months: number },
): string {
  const params = new URLSearchParams(current);
  params.delete('kind');
  params.delete('months');
  if (state.kind !== 'all') params.set('kind', state.kind);
  if (state.months !== DEFAULT_OBLIGATION_MONTHS) params.set('months', String(state.months));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function monthsLabel(months: number): string {
  return `${months} month${months === 1 ? '' : 's'}`;
}

const TYPE_NOUN: [ObligationItem['type'], string, string][] = [
  ['card_bill', 'card bill', 'card bills'],
  ['emi', 'EMI', 'EMIs'],
  ['lending_due', 'lending', 'lendings'],
  ['statement_expected', 'statement', 'statements'],
];

/** "3 EMIs · 1 statement". */
export function countsByType(items: ObligationItem[]): string {
  return TYPE_NOUN.map(([type, one, many]) => {
    const n = items.filter((i) => i.type === type).length;
    return n === 0 ? null : `${n} ${n === 1 ? one : many}`;
  })
    .filter(Boolean)
    .join(' · ');
}

export interface UpcomingTile {
  id: 'overdue' | 'next7' | 'month' | 'dueBack';
  label: string;
  /** The formatted figure. */
  value: string;
  tone: 'danger' | 'ink' | 'positive';
  caption: string;
}

/**
 * The four totals of the Upcoming page, over the (already filtered) items. A tile with no items
 * behind it is left out; amounts add up only rows that carry one.
 */
export function buildTiles(items: ObligationItem[], today: string): UpcomingTile[] {
  const w = obligationWindows(items, today);
  const dueBack = items.filter((i) => i.type === 'lending_due' && i.direction === 'lent');
  const tiles: UpcomingTile[] = [];
  if (w.overdue.length > 0) {
    tiles.push({
      id: 'overdue',
      label: 'Overdue',
      value: rupeesExact(sumAmounts(w.overdue)),
      tone: 'danger',
      caption: countsByType(w.overdue),
    });
  }
  if (w.next7.length > 0) {
    tiles.push({
      id: 'next7',
      label: 'Next 7 days',
      value: rupeesExact(sumAmounts(w.next7)),
      tone: 'ink',
      caption: countsByType(w.next7),
    });
  }
  if (w.thisMonth.length > 0) {
    tiles.push({
      id: 'month',
      label: 'This month',
      value: rupeesExact(sumAmounts(w.thisMonth)),
      tone: 'ink',
      caption: `${w.thisMonth.length} item${w.thisMonth.length === 1 ? '' : 's'}`,
    });
  }
  if (dueBack.length > 0) {
    const next = dueBack
      .map((i) => i.date)
      .filter((d): d is string => Boolean(d))
      .sort()[0];
    const when = next ? formatDayMonth(next) : null;
    let caption: string;
    if (dueBack.length === 1) {
      const who = firstNameOf(dueBack[0].counterpartyName ?? '');
      caption = [who, when].filter(Boolean).join(' · ');
    } else {
      caption = [`${dueBack.length} people`, when ? `next ${when}` : null].filter(Boolean).join(' · ');
    }
    tiles.push({
      id: 'dueBack',
      label: 'Due back to you',
      value: `+${rupeesExact(sumAmounts(dueBack))}`,
      tone: 'positive',
      caption,
    });
  }
  return tiles;
}

export type RowAmountTone = 'danger' | 'positive' | 'ink' | 'none';

export interface RowAmount {
  text: string;
  tone: RowAmountTone;
}

/** The amount cell of a row: danger when overdue, "+" in green when money comes to you, "—" when none. */
export function rowAmount(item: ObligationItem): RowAmount {
  if (item.amount == null) return { text: '—', tone: 'none' };
  if (item.status === 'overdue') return { text: rupeesExact(item.amount), tone: 'danger' };
  if (item.type === 'lending_due' && item.direction === 'lent') {
    return { text: `+${rupeesExact(item.amount)}`, tone: 'positive' };
  }
  return { text: rupeesExact(item.amount), tone: 'ink' };
}

/** "SBI Cashback ••3356" style context: when it falls due, then the account. */
export function rowSubtitleParts(
  item: ObligationItem,
  daysText: (days: number) => string,
): string[] {
  const parts: string[] = [];
  if (item.daysUntil != null) parts.push(daysText(item.daysUntil));
  else if (!item.date) parts.push('Due date unknown');
  if (item.accountName) parts.push(item.accountName);
  return parts;
}

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The DateTile content of a dated row; null when undated. */
export function rowDate(item: ObligationItem): { day: number; monthLabel: string } | null {
  if (!item.date) return null;
  const [, m, d] = item.date.split('-').map(Number);
  return { day: d, monthLabel: MONTH_SHORT[m - 1] };
}

/** "December · 3 · ₹63,954" (the total only when a row carries an amount). */
export function foldedMonthLine(label: string, items: ObligationItem[]): string {
  const total = items.some((i) => i.amount != null) ? rupeesExact(sumAmounts(items)) : null;
  return [label.split(' ')[0], String(items.length), total].filter(Boolean).join(' · ');
}
