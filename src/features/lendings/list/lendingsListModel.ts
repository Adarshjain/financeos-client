import { daysBetween, type TileModel } from '@/features/loans/loanFormatModel';
import { LENDINGS_HREF } from '@/features/loans/loansLendingsTabs';
import { DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { formatCount, formatDate, formatMoney, initialsOf } from '@/lib/format';
import type {
  CounterpartyDirectionFilter,
  CounterpartyListItem,
  CounterpartyMatchSuggestions,
  CounterpartySummary,
  CounterpartySummaryBucket,
  UnrecordedTransfer,
} from '@/lib/lending.types';

// ---- URL state -------------------------------------------------------------

export type LendingFilter = 'all' | 'owed' | 'owe' | 'settled';

export const LENDING_FILTERS: { value: LendingFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owed', label: 'Owed to you' },
  { value: 'owe', label: 'You owe' },
  { value: 'settled', label: 'Settled' },
];

const DIRECTION: Record<LendingFilter, CounterpartyDirectionFilter | undefined> = {
  all: undefined,
  owed: 'OWED_TO_YOU',
  owe: 'YOU_OWE',
  settled: 'SETTLED',
};

export const LENDINGS_SIZE_OPTIONS = [10, 25, 50];

export interface LendingsUrlState {
  q: string;
  filter: LendingFilter;
  page: number;
  size: number;
}

/** The `direction` the server filters by for a chip. */
export function directionFor(filter: LendingFilter): CounterpartyDirectionFilter | undefined {
  return DIRECTION[filter];
}

export function parseFilter(raw: string | undefined): LendingFilter {
  return LENDING_FILTERS.some((f) => f.value === raw) ? (raw as LendingFilter) : 'all';
}

export function parseLendingsUrl(params: SearchParamsRecord): LendingsUrlState {
  return {
    q: (first(params.q) ?? '').trim(),
    filter: parseFilter(first(params.filter)),
    ...parsePage(params, { sizes: LENDINGS_SIZE_OPTIONS }),
  };
}

/** The Lendings tab URL for a state: defaults stay out of the query string. */
export function lendingsUrl(state: LendingsUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.filter !== 'all') query.set('filter', state.filter);
  setPageParam(query, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${LENDINGS_HREF}?${text}` : LENDINGS_HREF;
}

// ---- Tiles -----------------------------------------------------------------

function bucketContext(bucket: CounterpartySummaryBucket, empty: string): string {
  if (bucket.count === 0) return empty;
  if (bucket.nextName && bucket.nextDate) return `${bucket.nextName} · ${formatDate(bucket.nextDate, 'list')}`;
  return formatCount(bucket.count, ['entry', 'entries']);
}

/** The four Lendings tiles. A tile with nothing in it reads ₹0 with a plain "Nothing …" line. */
export function lendingTiles(summary: CounterpartySummary): TileModel[] {
  return [
    {
      label: 'Owed to you',
      value: formatMoney(summary.owedToYou),
      context: formatCount(summary.owedToYouCount, ['person', 'people']),
      tone: summary.owedToYou > 0 ? 'positive' : undefined,
    },
    {
      label: 'You owe',
      value: formatMoney(summary.youOwe),
      context: formatCount(summary.youOweCount, ['person', 'people']),
    },
    {
      label: 'Due this month',
      value: formatMoney(summary.dueThisMonth.amount),
      context: bucketContext(summary.dueThisMonth, 'Nothing due'),
    },
    {
      label: 'Expected back',
      value: formatMoney(summary.expectedBack.amount),
      context: bucketContext(summary.expectedBack, 'Nothing expected'),
      tone: summary.expectedBack.amount > 0 ? 'positive' : undefined,
    },
  ];
}

// ---- Rows ------------------------------------------------------------------

export type PersonSide = 'owed' | 'owe' | 'settled';
export type AvatarToneName = 'brand' | 'info' | 'warning' | 'neutral' | 'positive';

const AVATAR_TONES: AvatarToneName[] = ['brand', 'info', 'warning', 'neutral', 'positive'];

export interface LendingRow {
  id: string;
  name: string;
  initials: string;
  avatarTone: AvatarToneName;
  side: PersonSide;
  directionLabel: string;
  directionTone: 'success' | 'warning' | 'neutral';
  /** "+15,000" when they owe you, "12,000" when you owe them, "0" when settled. */
  balance: string;
  balanceTone: 'positive' | 'ink';
  /** "28 Oct · in 15 d" or "no date". */
  expected: string;
  hasExpected: boolean;
  /** "10 Oct · repaid ₹10,000", or null before any entry. */
  lastEntry: string | null;
  phoneSub: string;
  href: string;
}

/** A stable colour per person, so a name keeps its tone between visits. */
export function avatarToneFor(name: string): AvatarToneName {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function sideOf(netPosition: number): PersonSide {
  if (netPosition > 0) return 'owed';
  if (netPosition < 0) return 'owe';
  return 'settled';
}

const SIDE_BADGE: Record<PersonSide, { label: string; tone: LendingRow['directionTone'] }> = {
  owed: { label: 'Owes you', tone: 'success' },
  owe: { label: 'You owe', tone: 'warning' },
  settled: { label: 'Settled', tone: 'neutral' },
};

/** "in 15 d", "today", "3 d overdue". */
export function dueIn(days: number): string {
  if (days === 0) return 'today';
  return days > 0 ? `in ${days} d` : `${-days} d overdue`;
}

/** "28 Oct · in 15 d", or "no date". */
export function expectedText(expectedReturnDate: string | null | undefined, today: string): string {
  if (!expectedReturnDate) return 'no date';
  const days = daysBetween(today, expectedReturnDate);
  const day = formatDate(expectedReturnDate, 'list');
  return days === null ? day : `${day} · ${dueIn(days)}`;
}

/**
 * The last entry in the person's own words. Money in or out of a principal entry reads "lent" or
 * "borrowed". A settlement reads "repaid ₹X" while a balance remains and "settled ₹X" when that
 * entry cleared it, whichever way the money moved (they repaid you, or you repaid them).
 */
export function lastEntryText(person: CounterpartyListItem): string | null {
  if (!person.lastEntryDate || !person.lastEntryType) return null;
  const date = formatDate(person.lastEntryDate, 'list');
  if (person.lastEntryKind !== 'settlement') return `${date} · ${person.lastEntryType}`;
  const amount = person.lastEntryAmount != null ? ` ${formatMoney(person.lastEntryAmount)}` : '';
  const word = person.netPosition === 0 ? 'settled' : 'repaid';
  return `${date} · ${word}${amount}`;
}

/** The phone row's second line: when it is expected back (or due) and when the last entry was. */
export function phoneSubText(person: CounterpartyListItem): string {
  const parts: string[] = [];
  if (person.expectedReturnDate) {
    parts.push(`${person.netPosition < 0 ? 'due' : 'expected'} ${formatDate(person.expectedReturnDate, 'list')}`);
  }
  if (person.lastEntryDate) parts.push(`last entry ${formatDate(person.lastEntryDate, 'list')}`);
  if (parts.length === 0 && person.notes) parts.push(person.notes);
  return parts.join(' · ');
}

export function lendingRow(person: CounterpartyListItem, today: string): LendingRow {
  const side = sideOf(person.netPosition);
  const badge = SIDE_BADGE[side];
  const balance =
    side === 'owed'
      ? formatMoney(person.netPosition, { sign: 'always', symbol: false })
      : side === 'owe'
        ? formatMoney(-person.netPosition, { symbol: false })
        : '0';
  return {
    id: person.id,
    name: person.name,
    initials: initialsOf(person.name),
    avatarTone: avatarToneFor(person.name),
    side,
    directionLabel: badge.label,
    directionTone: badge.tone,
    balance,
    balanceTone: side === 'owed' ? 'positive' : 'ink',
    expected: expectedText(person.expectedReturnDate, today),
    hasExpected: Boolean(person.expectedReturnDate),
    lastEntry: lastEntryText(person),
    phoneSub: phoneSubText(person),
    href: appHref(`/loans/lendings/${person.id}`),
  };
}

// ---- Unlinked bank transfers -------------------------------------------------

export interface TransferRow {
  /** One row per (entry, candidate) pair. */
  key: string;
  lendingId: string;
  transactionId: string;
  personName: string;
  /** The entry's day, "29 Aug": the linked state reads "already linked to the 29 Aug entry". */
  entryLabel: string;
  /** "IMPS from Priya Nair · ₹2,300" */
  title: string;
  /** `13 Sep · HDFC Savings · "split"` */
  subtitle: string;
}

/** Every (entry, candidate) pair of the suggestions as a row; `accountNames` maps account ids to names. */
export function transferRows(
  people: readonly CounterpartyMatchSuggestions[],
  accountNames: ReadonlyMap<string, string>,
): TransferRow[] {
  const rows: TransferRow[] = [];
  for (const person of people) {
    for (const entry of person.suggestions) {
      for (const tx of entry.candidates) {
        const description = tx.description || tx.sourcedDescription || 'Transaction';
        const account = accountNames.get(tx.accountId);
        const notes = entry.notes?.trim();
        rows.push({
          key: `${entry.lendingId}:${tx.id}`,
          lendingId: entry.lendingId,
          transactionId: tx.id,
          personName: person.counterpartyName,
          entryLabel: formatDate(entry.entryDate, 'list'),
          title: `${description} · ${formatMoney(Math.abs(tx.amount))}`,
          subtitle: [formatDate(tx.date, 'list'), account, notes ? `"${notes}"` : null].filter(Boolean).join(' · '),
        });
      }
    }
  }
  return rows;
}

export interface UnrecordedRow {
  /** The bank transaction's id: one row per transfer. */
  key: string;
  counterpartyId: string;
  transactionId: string;
  personName: string;
  /** "Received from Priya Nair · ₹2,000" or "Paid to Priya Nair · ₹2,000" */
  title: string;
  /** "13 Oct · HDFC Savings" */
  subtitle: string;
}

/** Each unrecorded transfer as a row; `accountNames` maps account ids to names. */
export function unrecordedRows(
  transfers: readonly UnrecordedTransfer[],
  accountNames: ReadonlyMap<string, string>,
): UnrecordedRow[] {
  return transfers.map((t) => {
    const tx = t.transaction;
    const word = t.direction === 'borrowed' ? 'Received from' : 'Paid to';
    return {
      key: tx.id,
      counterpartyId: t.counterpartyId,
      transactionId: tx.id,
      personName: t.counterpartyName,
      title: `${word} ${t.counterpartyName} · ${formatMoney(Math.abs(tx.amount))}`,
      subtitle: [formatDate(tx.date, 'list'), accountNames.get(tx.accountId)].filter(Boolean).join(' · '),
    };
  });
}
