import type { Account } from '@/lib/account.types';
import type { Schemas } from '@/lib/api/types';
import { formatCount, formatDate } from '@/lib/format';
import { AccountType } from '@/lib/types';

// The generated types say every field is a plain, always-present string; these narrow the ones the page switches on
// and mark the ones the server leaves null.
export type SuggestionKind = 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ADDON_CARD' | 'REPLACEMENT_CARD';
export type SuggestionBand = 'FOUND' | 'OLDER' | 'MAYBE';
export type SuggestionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ScanStatus = 'NOT_STARTED' | 'IDLE' | 'RUNNING' | 'PAUSED_AUTH' | 'FAILED';

type GeneratedItem = Schemas['AccountSuggestionItem'];

export type ScanState = Omit<Schemas['AccountSuggestionScan'], 'status'> & { status: ScanStatus };

export type SuggestionItem = Omit<
  GeneratedItem,
  'kind' | 'kindConf' | 'band' | 'variant' | 'variantConf' | 'parentAccount' | 'candidateAccount' | 'parentSuggestionId' | 'lifecycle' | 'lifecycleConf' | 'limitBucket' | 'limitConf' | 'limitAmount' | 'passwordFromProfile' | 'notInYourName' | 'firstSeenOn' | 'lastSeenOn' | 'evidenceMails' | 'variantCandidates' | 'children'
> & {
  kind: SuggestionKind;
  kindConf: SuggestionConfidence;
  band: SuggestionBand;
  variant?: string | null;
  variantConf?: SuggestionConfidence | null;
  variantCandidates?: string[] | null;
  lifecycle?: string | null;
  lifecycleConf?: SuggestionConfidence | null;
  limitBucket?: string | null;
  /** The limit the statements state, when they state one exactly. */
  limitAmount?: number | null;
  /** The server can build the statement password from the profile (name and birth date) for this bank. */
  passwordFromProfile?: boolean;
  /** Its statements are not in the user's name; the server already put it under Maybe yours. */
  notInYourName?: boolean;
  limitConf?: SuggestionConfidence | null;
  firstSeenOn?: string | null;
  lastSeenOn?: string | null;
  evidenceMails?: number | null;
  parentSuggestionId?: string | null;
  parentAccount: (Omit<Schemas['AccountSuggestionParentAccount'], 'last4'> & { last4?: string | null }) | null;
  candidateAccount: Schemas['AccountSuggestionCandidateAccount'] | null;
  /** Add-ons and debit cards that come with this suggestion; they are not rows of their own. */
  children?: SuggestionChild[];
};

/** An add-on or debit card that comes with its parent suggestion (one level only). */
export type SuggestionChild = Omit<Schemas['AccountSuggestionChild'], 'kind' | 'band' | 'lifecycle' | 'lifecycleConf' | 'firstSeenOn' | 'lastSeenOn'> & {
  kind: SuggestionKind;
  band: SuggestionBand;
  lifecycle?: string | null;
  lifecycleConf?: SuggestionConfidence | null;
  firstSeenOn?: string | null;
  lastSeenOn?: string | null;
};

export interface AccountSuggestions {
  scan: ScanState;
  items: SuggestionItem[];
}

/** The two sections that list suggestions; Brokers and Wallets never do. */
export type SuggestionSection = 'bank' | 'card';

/** One suggestion drawn as a row of its section's table. */
export interface SuggestionRow {
  suggestion: true;
  id: string;
  /** Never closed: lets a suggestion row sit in the same table as account rows. */
  closed: false;
  band: SuggestionBand;
  kind: SuggestionItem['kind'];
  /** The issuer id, for the bank logo. */
  bankId: string;
  name: string;
  last4: string | null;
  /** The second line: the parent account and the server caption, or the "Is this your …?" question. */
  sub: string;
  parentAccountId: string | null;
  /** Set while the server asks "is this your {account}?". */
  isThis: { accountId: string; accountName: string } | null;
  /** Set on an older card number that sits on an account we have: "Older number on {account}?". */
  olderOn?: { accountId: string; accountName: string } | null;
  /** The whole suggestion, for the prefilled Add dialogs. */
  item?: SuggestionItem;
}

export function isSuggestionRow(row: object): row is SuggestionRow {
  return 'suggestion' in row;
}

export interface SuggestionBands {
  found: SuggestionRow[];
  older: SuggestionRow[];
  maybe: SuggestionRow[];
}

export interface SectionSuggestions {
  bands: SuggestionBands;
  /** The existing accounts the rows hang off, for the Edit dialog behind "Add". */
  parents: Account[];
  /** Every account of the section's type: where "Part of another account" can put a suggestion. */
  accounts?: Account[];
}

export const EMPTY_BANDS: SuggestionBands = { found: [], older: [], maybe: [] };

export function sectionOfKind(kind: SuggestionItem['kind']): SuggestionSection {
  return kind === 'BANK_ACCOUNT' || kind === 'DEBIT_CARD' ? 'bank' : 'card';
}

function sameBankWord(variant: string, bankName: string): boolean {
  return variant.toLowerCase().startsWith(bankName.toLowerCase());
}

/** A card name with the bank in front: catalogue names are short ("Regalia"), so the bank goes first unless it is already there. */
export function withBankName(item: Pick<SuggestionItem, 'bank'>, variant: string): string {
  return sameBankWord(variant, item.bank.name) ? variant : `${item.bank.name} ${variant}`;
}

export function suggestionTitle(item: SuggestionItem): string {
  switch (item.kind) {
    case 'BANK_ACCOUNT':
      return `${item.bank.name} account`;
    case 'CREDIT_CARD': {
      const named = item.variant && (item.variantConf === 'HIGH' || item.variantConf === 'MEDIUM');
      if (!named) return `${item.bank.name} card`;
      return withBankName(item, item.variant!);
    }
    case 'DEBIT_CARD':
      return 'Debit card';
    case 'ADDON_CARD':
      return 'Add-on card';
    case 'REPLACEMENT_CARD':
      return 'Replacement card';
  }
}

/** An older credit or debit card number whose account is known: the server's guess that it is a past number of that card. */
export function isOlderNumberGuess(item: Pick<SuggestionItem, 'kind' | 'band' | 'parentAccount' | 'candidateAccount'>): boolean {
  return (item.kind === 'CREDIT_CARD' || item.kind === 'DEBIT_CARD') && item.band === 'OLDER' && !!item.parentAccount && !item.candidateAccount;
}

export function suggestionSecondLine(item: SuggestionItem): string {
  if (item.candidateAccount) return `Is this your ${item.candidateAccount.name}?`;
  if (isOlderNumberGuess(item)) return `Older number on ${item.parentAccount!.name}?`;
  const parent = item.parentAccount;
  const on = parent ? `On ${parent.name}${parent.last4 ? ` ••${parent.last4}` : ''}` : '';
  return [on, item.caption].filter((part) => part && part.trim()).join(' · ');
}

export function suggestionRow(item: SuggestionItem): SuggestionRow {
  return {
    suggestion: true,
    id: item.id,
    closed: false,
    band: item.band,
    kind: item.kind,
    bankId: item.bank.id,
    name: suggestionTitle(item),
    last4: item.last4 || null,
    sub: suggestionSecondLine(item),
    parentAccountId: item.parentAccount?.id ?? null,
    isThis: item.candidateAccount ? { accountId: item.candidateAccount.id, accountName: item.candidateAccount.name } : null,
    olderOn: isOlderNumberGuess(item) ? { accountId: item.parentAccount!.id, accountName: item.parentAccount!.name } : null,
    item,
  };
}

/** The accounts a suggestion can be filed under: same bank, and a credit card for a card, a bank account for a bank-side one. */
export function fittingAccounts(row: Pick<SuggestionRow, 'kind' | 'bankId'>, accounts: readonly Account[]): Account[] {
  const type = sectionOfKind(row.kind) === 'bank' ? AccountType.BANK_ACCOUNT : AccountType.CREDIT_CARD;
  return accounts.filter((a) => a.type === type && !!a.bank && a.bank === row.bankId);
}

function toBands(rows: SuggestionRow[]): SuggestionBands {
  return {
    found: rows.filter((r) => r.band === 'FOUND'),
    older: rows.filter((r) => r.band === 'OLDER'),
    maybe: rows.filter((r) => r.band === 'MAYBE'),
  };
}

/**
 * The suggestions of each section, grouped by band in the server's order. Children are not rows: the parent's caption
 * already counts them and they are added with it.
 */
export function splitSuggestions(
  items: readonly SuggestionItem[],
  accounts: readonly Account[],
): Record<SuggestionSection, SectionSuggestions> {
  const rows = items.map(suggestionRow);
  const parentIds = new Set(rows.flatMap((r) => (r.parentAccountId ? [r.parentAccountId] : [])));
  const parents = accounts.filter((a) => parentIds.has(a.id));
  const of = (section: SuggestionSection) => ({
    bands: toBands(rows.filter((r) => sectionOfKind(r.kind) === section)),
    parents,
    accounts: accounts.filter((a) => a.type === (section === 'bank' ? AccountType.BANK_ACCOUNT : AccountType.CREDIT_CARD)),
  });
  return { bank: of('bank'), card: of('card') };
}

export function suggestionCount(bands: SuggestionBands): number {
  return bands.found.length + bands.older.length + bands.maybe.length;
}

/** The title of the Found in your email card, with the count of its Found rows (none shown when only Older or Maybe rows are left). */
export function foundBandLabel(count: number): string {
  return count > 0 ? `Found in your email · ${count}` : 'Found in your email';
}

/** The Found card's subtitle: suggestions come from emails, so they can be wrong or incomplete. */
export const FOUND_NOTE_COPY =
  'We can miss an account or get a detail wrong. Check each one before you add it, and add any we missed yourself.';

/** "From your HDFC Bank emails": where a suggestion came from, so it never reads as an account the user added. */
export function fromEmailsLine(row: Pick<SuggestionRow, 'item'>): string {
  return row.item ? `From your ${row.item.bank.name} emails` : 'From your emails';
}

/**
 * A row's second line in the Found card: where it came from, the account it sits on and its number. While the server
 * asks a question ("Is this your …?", "Older number on …?") the question follows the number we found, so the user
 * can tell which account is meant; with no number, the email count and date stand in for it.
 */
export function foundRowSub(row: Pick<SuggestionRow, 'item' | 'sub' | 'last4' | 'isThis' | 'olderOn'>): string {
  if (row.isThis || row.olderOn) {
    const seen = row.last4 ? `••${row.last4}` : row.item?.caption?.trim() || '';
    return `${[fromEmailsLine(row), seen].filter(Boolean).join(' · ')}. ${row.sub}`;
  }
  const parent = row.item?.parentAccount;
  return [fromEmailsLine(row), parent ? `On ${parent.name}` : '', row.last4 ? `••${row.last4}` : '']
    .filter(Boolean)
    .join(' · ');
}

/**
 * The evidence line under a Found row: how many emails and over which dates ("Seen in 3 emails from 02/01/2026 to 09/03/2026",
 * one date when both are the same, "Seen in 1 email on …"). Null when the server counted no emails.
 */
export function seenInEmailsLine(item: Pick<SuggestionItem, 'evidenceMails' | 'firstSeenOn' | 'lastSeenOn'> | null | undefined): string | null {
  const n = item?.evidenceMails;
  if (!item || !n || n < 1) return null;
  const count = `Seen in ${formatCount(n)} ${n === 1 ? 'email' : 'emails'}`;
  const first = item.firstSeenOn || null;
  const last = item.lastSeenOn || null;
  if (first && last && first !== last) return `${count} from ${formatDate(first, 'list')} to ${formatDate(last, 'list')}`;
  const only = first ?? last;
  return only ? `${count} on ${formatDate(only, 'list')}` : count;
}

/** Bank and card suggestions together, for the one Found card: bank rows first in each band, every account a row can be filed under. */
export function mergeSuggestions(found: Record<SuggestionSection, SectionSuggestions>): SectionSuggestions {
  const { bank, card } = found;
  return {
    bands: {
      found: [...bank.bands.found, ...card.bands.found],
      older: [...bank.bands.older, ...card.bands.older],
      maybe: [...bank.bands.maybe, ...card.bands.maybe],
    },
    parents: [...bank.parents, ...card.parents.filter((p) => !bank.parents.includes(p))],
    accounts: [...(bank.accounts ?? []), ...(card.accounts ?? [])],
  };
}

/** Which word the Older band uses: "Older accounts" when a bank account is among them, else "Older cards". */
export function olderBandSection(older: readonly Pick<SuggestionRow, 'kind'>[]): SuggestionSection {
  return older.some((r) => r.kind === 'BANK_ACCOUNT') ? 'bank' : 'card';
}

export function olderBandLabel(section: SuggestionSection, count: number): string {
  return `${section === 'bank' ? 'Older accounts' : 'Older cards'} · ${count}`;
}

export function maybeBandLabel(count: number): string {
  return `Maybe yours · ${count}`;
}

/** Whether the "Finding your accounts" card shows: Gmail is connected and the first scan is still going. */
export function isScanProgressShown(scan: ScanState | null | undefined): boolean {
  return !!scan && scan.gmailConnected && !scan.firstScanDone && (scan.status === 'RUNNING' || scan.status === 'IDLE');
}

/** Seconds of reading per email, from the scan's measured pace. */
const SECONDS_PER_MAIL = 0.048;

export function scanEtaText(mailsSeen: number, mailsTotal: number): string {
  const minutes = Math.max(1, Math.ceil((Math.max(0, mailsTotal - mailsSeen) * SECONDS_PER_MAIL) / 60));
  return `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left.`;
}

export function scanProgressLine(scan: Pick<ScanState, 'mailsSeen' | 'mailsTotal'>): string {
  if (scan.mailsTotal <= 0) return 'Reading your emails.';
  return `Read ${formatCount(scan.mailsSeen)} of ${formatCount(scan.mailsTotal)} emails. ${scanEtaText(scan.mailsSeen, scan.mailsTotal)}`;
}

/** The bar's value (0 to 100), or undefined (indeterminate) while the total is not known. */
export function scanProgressValue(scan: Pick<ScanState, 'mailsSeen' | 'mailsTotal'>): number | undefined {
  if (scan.mailsTotal <= 0) return undefined;
  return Math.min(100, Math.max(0, (scan.mailsSeen / scan.mailsTotal) * 100));
}

/**
 * What the Accounts page draws: the whole-page empty state, the sections alone (nothing to total yet, but there is
 * something to find or show), or the KPI tiles and the sections.
 */
export function accountsBodyMode(input: {
  accountCount: number;
  progressShown: boolean;
  suggestionCount: number;
}): 'empty' | 'sections' | 'full' {
  if (input.accountCount > 0) return 'full';
  return input.progressShown || input.suggestionCount > 0 ? 'sections' : 'empty';
}

const EMPTY_COPY_WHILE_SCANNING: Record<'bank' | 'card' | 'broker', string> = {
  bank: 'Accounts we find in your email show up at the top of this page.',
  card: 'Cards we find in your email show up at the top of this page.',
  broker: "Add a broker with +. We don't look for these.",
};

/** The empty-section copy while the progress card shows; undefined keeps the section's own. Wallets always keep theirs. */
export function scanningEmptyCopy(section: 'bank' | 'card' | 'broker', progressShown: boolean): string | undefined {
  return progressShown ? EMPTY_COPY_WHILE_SCANNING[section] : undefined;
}
