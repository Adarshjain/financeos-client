import type { LendingDirection, LendingKind } from '@/lib/lending.types';
import { type LendingEntryType, toEntryType } from '@/lib/lendingEntry';
import { formatDate, formatMoney } from '@/lib/utils';

/**
 * Plain-text rendering of a person's lending ledger, written for the *receiver*.
 *
 * Everything here is pure so the exact output is unit-testable; the dialog only
 * wires selection, names and toggles into {@link buildLendingLedgerText}.
 *
 * Wording: each party is a name when given, otherwise a pronoun — so a blank
 * "your name" yields "I lent Rahul" / "Rahul owes me", and both blank yields
 * "I lent you" / "You owe me". The app's own first-person labels ("You repaid",
 * "They repaid") are never used: the reader is the other side of the ledger.
 */

/** Below this a balance counts as zero (running balances are float sums). */
export const BALANCE_TOLERANCE = 0.005;

/** The slice of a ledger entry the export needs — structurally matches the page's rows. */
export interface ExportableEntry {
  id: string;
  direction: LendingDirection;
  kind?: LendingKind;
  amount: number;
  entryDate: string;
  expectedReturnDate?: string | null;
  notes?: string | null;
  /** Σ lent − Σ borrowed after this entry, over the whole loaded ledger (ascending). */
  runningBalance: number;
}

export interface LendingExportToggles {
  includeNotes: boolean;
  includeExpectedReturn: boolean;
  includeTotals: boolean;
  includeRunningBalance: boolean;
}

export const DEFAULT_LENDING_EXPORT_TOGGLES: LendingExportToggles = {
  includeNotes: true,
  includeExpectedReturn: false,
  includeTotals: true,
  includeRunningBalance: false,
};

export interface LendingExportOptions extends LendingExportToggles {
  /** Blank/null → "I" / "me". */
  myName: string | null;
  /** Blank/null → "you". */
  theirName: string | null;
  /** Signed like the running balance (positive = they owe me); null → no opening line. */
  openingBalance: number | null;
}

export interface BuildLedgerTextInput {
  /** Every loaded entry, ascending by date, with running balances. */
  entries: ExportableEntry[];
  selectedIds: ReadonlySet<string>;
  /** ISO calendar date used for the "As of" line. */
  today: string;
  options: LendingExportOptions;
}

interface PartyForms {
  subject: string;
  object: string;
  /** Verb agreement for "owe": names take "owes", pronouns take "owe". */
  owe: string;
}

function cleanName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

function meForms(myName: string | null): PartyForms {
  const name = cleanName(myName);
  return name ? { subject: name, object: name, owe: 'owes' } : { subject: 'I', object: 'me', owe: 'owe' };
}

function themForms(theirName: string | null): PartyForms {
  const name = cleanName(theirName);
  return name ? { subject: name, object: name, owe: 'owes' } : { subject: 'you', object: 'you', owe: 'owe' };
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function isSettledBalance(balance: number): boolean {
  return Math.abs(balance) < BALANCE_TOLERANCE;
}

/** The money-flow sign of an entry: lent adds to what they owe me, borrowed subtracts. */
export function signedAmount(entry: Pick<ExportableEntry, 'direction' | 'amount'>): number {
  return entry.direction === 'lent' ? entry.amount : -entry.amount;
}

/** `Adarsh lent Rahul` / `You repaid me` — sentence-case, no amount. */
export function entryPhrase(type: LendingEntryType, myName: string | null, theirName: string | null): string {
  const me = meForms(myName);
  const them = themForms(theirName);
  switch (type) {
    case 'lent':
      return capitalize(`${me.subject} lent ${them.object}`);
    case 'borrowed':
      return capitalize(`${them.subject} lent ${me.object}`);
    case 'repaid_by_me':
      return capitalize(`${me.subject} repaid ${them.object}`);
    case 'repaid_to_me':
      return capitalize(`${them.subject} repaid ${me.object}`);
  }
}

/**
 * `Rahul owes Adarsh ₹5,000.00` / `you owe me ₹5,000.00` / `₹0.00 (settled)`.
 * Natural case (a leading pronoun stays lower-case) because it always follows a
 * label and a colon.
 */
export function balancePhrase(balance: number, myName: string | null, theirName: string | null): string {
  if (isSettledBalance(balance)) return `${formatMoney(0)} (settled)`;
  const me = meForms(myName);
  const them = themForms(theirName);
  return balance > 0
    ? `${them.subject} ${them.owe} ${me.object} ${formatMoney(balance)}`
    : `${me.subject} ${me.owe} ${them.object} ${formatMoney(-balance)}`;
}

/** Labels for the opening-balance direction control, in the same wording as the text. */
export function directionLabels(myName: string | null, theirName: string | null): { theyOwe: string; iOwe: string } {
  const me = meForms(myName);
  const them = themForms(theirName);
  return {
    theyOwe: capitalize(`${them.subject} ${them.owe} ${me.object}`),
    iOwe: capitalize(`${me.subject} ${me.owe} ${them.object}`),
  };
}

export function headerLine(myName: string | null, theirName: string | null): string {
  const me = cleanName(myName);
  const them = cleanName(theirName);
  if (me && them) return `Lending ledger · ${me} & ${them}`;
  const one = me ?? them;
  return one ? `Lending ledger with ${one}` : 'Lending ledger';
}

/**
 * Ids of the entries after the most recent point the running balance hit zero.
 * If the ledger is square right now, that is the cycle just settled (after the
 * previous zero) rather than nothing. With no zero at all, every entry.
 */
export function sinceLastSettledIds(entries: ExportableEntry[]): Set<string> {
  if (entries.length === 0) return new Set();
  const last = entries.length - 1;
  const zeros: number[] = [];
  entries.forEach((e, i) => {
    if (isSettledBalance(e.runningBalance)) zeros.push(i);
  });
  const relevant = isSettledBalance(entries[last].runningBalance) ? zeros.filter((i) => i !== last) : zeros;
  const start = relevant.length > 0 ? relevant[relevant.length - 1] + 1 : 0;
  return new Set(entries.slice(start).map((e) => e.id));
}

/**
 * Statement-style default for the opening balance: the running balance of the
 * entry just before the first selected one (zero when it is the first entry or
 * nothing is selected). Rounded to paise so float noise never shows as 0.004.
 */
export function derivedOpeningBalance(entries: ExportableEntry[], selectedIds: ReadonlySet<string>): number {
  const firstIdx = entries.findIndex((e) => selectedIds.has(e.id));
  if (firstIdx <= 0) return 0;
  const rounded = Math.round(entries[firstIdx - 1].runningBalance * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/**
 * `As of 7 Oct 26 · Entries from 18 Jan 26 to 1 Oct 26`. When every selected
 * entry shares one date the range is dropped: the entry lines already show it,
 * and an unlabelled lone date next to "As of" reads like a second as-of date.
 */
function periodLine(selected: ExportableEntry[], today: string): string {
  const asOf = `As of ${formatDate(today)}`;
  const first = formatDate(selected[0].entryDate);
  const last = formatDate(selected[selected.length - 1].entryDate);
  return first === last ? asOf : `${asOf} · Entries from ${first} to ${last}`;
}

export function buildLendingLedgerText({ entries, selectedIds, today, options }: BuildLedgerTextInput): string {
  const selected = entries.filter((e) => selectedIds.has(e.id));
  const { myName, theirName, openingBalance } = options;
  const lines: string[] = [headerLine(myName, theirName)];

  if (selected.length === 0) {
    lines.push(`As of ${formatDate(today)}`);
    lines.push('', 'No entries selected.');
    return lines.join('\n');
  }

  lines.push(periodLine(selected, today), '');

  if (openingBalance !== null) {
    lines.push(`Opening balance: ${balancePhrase(openingBalance, myName, theirName)}`, '');
  }

  let running = openingBalance ?? 0;
  const gross: Record<LendingEntryType, number> = { lent: 0, borrowed: 0, repaid_to_me: 0, repaid_by_me: 0 };

  selected.forEach((entry, i) => {
    const type = toEntryType(entry.direction, entry.kind);
    gross[type] += entry.amount;
    running += signedAmount(entry);

    lines.push(
      `${i + 1}. ${formatDate(entry.entryDate)} · ${entryPhrase(type, myName, theirName)} · ${formatMoney(entry.amount)}`,
    );

    const notes = options.includeNotes ? cleanName(entry.notes) : null;
    const expected =
      options.includeExpectedReturn && type !== 'repaid_by_me' && type !== 'repaid_to_me' && entry.expectedReturnDate
        ? `expected back by ${formatDate(entry.expectedReturnDate)}`
        : null;
    if (notes && expected) lines.push(`   ${notes} · ${expected}`);
    else if (notes) lines.push(`   ${notes}`);
    else if (expected) lines.push(`   ${expected}`);

    if (options.includeRunningBalance) {
      lines.push(`   Balance: ${balancePhrase(running, myName, theirName)}`);
    }
  });

  if (options.includeTotals && selected.length >= 2) {
    lines.push('', 'Totals');
    const order: LendingEntryType[] = ['lent', 'borrowed', 'repaid_to_me', 'repaid_by_me'];
    for (const type of order) {
      if (gross[type] > 0) lines.push(`${entryPhrase(type, myName, theirName)}: ${formatMoney(gross[type])}`);
    }
  }

  lines.push('');
  if (openingBalance !== null) {
    lines.push(`Closing balance: ${balancePhrase(running, myName, theirName)}`);
  } else {
    lines.push(`Net of listed entries: ${balancePhrase(running, myName, theirName)}`);
  }

  return lines.join('\n');
}
