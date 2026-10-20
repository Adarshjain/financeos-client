import type { ObligationItemDto } from '@/lib/api/types';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

export type ObligationItem = ObligationItemDto;

export type ObligationType = 'emi' | 'lending_due' | 'card_bill' | 'statement_expected';

export type ObligationKindFilter = 'all' | ObligationType;

/** The kind chips of the Upcoming filter row, in display order. */
export const OBLIGATION_KINDS: { value: ObligationKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'card_bill', label: 'Card bills' },
  { value: 'emi', label: 'EMIs' },
  { value: 'lending_due', label: 'Lending' },
  { value: 'statement_expected', label: 'Statements' },
];

/** How far ahead the Upcoming list looks, in months. */
export const OBLIGATION_MONTH_OPTIONS = [1, 3, 6, 12] as const;
export const DEFAULT_OBLIGATION_MONTHS = 3;

export function sumAmounts(items: ObligationItem[]): number {
  return items.reduce((s, i) => s + (i.amount ?? 0), 0);
}

export function addDays(date: string, n: number): string {
  const d = parseCalendarDate(date);
  d.setDate(d.getDate() + n);
  return toCalendarDate(d);
}

export interface ObligationBuckets {
  overdue: ObligationItem[];
  next7: ObligationItem[];
  laterThisMonth: ObligationItem[];
  months: { key: string; label: string; items: ObligationItem[] }[];
  undated: ObligationItem[];
}

/** Splits items into the List view sections; `today` is a YYYY-MM-DD calendar date. */
export function bucketObligations(items: ObligationItem[], today: string): ObligationBuckets {
  const in7 = addDays(today, 7);
  const monthPrefix = today.slice(0, 7);
  const out: ObligationBuckets = { overdue: [], next7: [], laterThisMonth: [], months: [], undated: [] };
  const byMonth = new Map<string, ObligationItem[]>();
  for (const item of items) {
    if (item.status === 'overdue') out.overdue.push(item);
    else if (!item.date) out.undated.push(item);
    else if (item.date <= in7) out.next7.push(item);
    else if (item.date.startsWith(monthPrefix)) out.laterThisMonth.push(item);
    else {
      const k = item.date.slice(0, 7);
      byMonth.set(k, [...(byMonth.get(k) ?? []), item]);
    }
  }
  out.months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      label: parseCalendarDate(`${key}-01`).toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      items: list,
    }));
  return out;
}

export interface ObligationWindows {
  overdue: ObligationItem[];
  next7: ObligationItem[];
  thisMonth: ObligationItem[];
}

/**
 * The items behind the Upcoming totals: overdue, due within 7 days, due this calendar month
 * (both of the latter exclude overdue and dated-before-today rows).
 */
export function obligationWindows(items: ObligationItem[], today: string): ObligationWindows {
  const in7 = addDays(today, 7);
  const month = today.slice(0, 7);
  const open = items.filter((i) => i.status !== 'overdue' && i.date && i.date >= today);
  return {
    overdue: items.filter((i) => i.status === 'overdue'),
    next7: open.filter((i) => i.date! <= in7),
    thisMonth: open.filter((i) => i.date!.startsWith(month)),
  };
}

export function obligationTitle(item: ObligationItem): string {
  if (item.title) return item.title;
  if (item.type === 'emi') return `${item.loanName} · EMI #${item.installmentSeq}`;
  return `${item.counterpartyName} (${item.direction === 'lent' ? 'Receivable' : 'Payable'})`;
}

export function obligationHref(item: ObligationItem): string | null {
  if (item.type === 'emi' && item.loanId) {
    return `/loans/${item.loanId}${item.installmentSeq != null ? `?installment=${item.installmentSeq}` : ''}`;
  }
  if (item.type === 'lending_due' && item.counterpartyId) {
    return `/loans/lendings/${item.counterpartyId}`;
  }
  return item.href ?? null;
}

export function daysText(days: number): string {
  if (days === 0) return 'today';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  const n = Math.abs(days);
  return `${n} day${n === 1 ? '' : 's'} overdue`;
}
