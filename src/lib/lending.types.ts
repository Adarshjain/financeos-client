// These mirror generated schema shapes field-for-field; re-exported as aliases
// instead of hand-duplicated so a server change can't silently drift the two.
export type {
  CounterpartyLedgerResponse,
  CounterpartyResponse,
  CreateCounterpartyRequest,
  CreateLendingRequest,
  LedgerEntryResponse,
  LendingResponse,
  ObligationsResponse,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/api/types';
import type { Schemas } from '@/lib/api/types';
import type { Transaction } from '@/lib/transaction.types';

/** Which way the money moved: lent = money out, borrowed = money in. */
export type LendingDirection = 'lent' | 'borrowed';

/** principal = new money lent/borrowed; settlement = a repayment clearing an existing balance. */
export type LendingKind = 'principal' | 'settlement';

export type ObligationItemDto = Schemas['ObligationItemDto'];

// Not (yet) named exports on '@/lib/api/types' — aliased directly off Schemas
// rather than editing that shared file, which this feature doesn't own.
export type LendingTransactionSummary = Schemas['LendingTransactionSummary'];
export type LinkLendingTransactionRequest = Schemas['LinkLendingTransactionRequest'];
export type CounterpartySuggestionResponse = Schemas['CounterpartySuggestionResponse'];

/**
 * What the person picker hands back: an existing counterparty, or a name the
 * server will create (or reuse by exact name) when the entry is saved.
 */
export type CounterpartySelection =
  | { kind: 'existing'; counterparty: Schemas['CounterpartyResponse'] }
  | { kind: 'new'; name: string };

export function selectionName(selection: CounterpartySelection): string {
  return selection.kind === 'new' ? selection.name : selection.counterparty.name;
}

/** The person page's counterparty (carries `firstEntryDate` and `linkedEntryCount`). */
export type PersonCounterparty = Schemas['CounterpartyResponse'];

/** What the person list reads: the generated shape plus the fields the Lendings table adds. */
type CounterpartyBase = Schemas['CounterpartyResponse'];
export interface CounterpartyListItem extends CounterpartyBase {
  lastEntryDate?: string | null;
  /** lent = money out, borrowed = money in. */
  lastEntryType?: LendingDirection | null;
  lastEntryKind?: LendingKind | null;
  lastEntryAmount?: number | null;
  /** Earliest expected return among the outstanding principal entries; null when settled or none set. */
  expectedReturnDate?: string | null;
}

/** GET /counterparties?direction= */
export type CounterpartyDirectionFilter = 'OWED_TO_YOU' | 'YOU_OWE' | 'SETTLED';

export interface CounterpartySummaryBucket {
  amount: number;
  count: number;
  nextName?: string | null;
  nextDate?: string | null;
}

/** GET /counterparties/summary: the Lendings tiles. */
export interface CounterpartySummary {
  owedToYou: number;
  owedToYouCount: number;
  /** Positive number. */
  youOwe: number;
  youOweCount: number;
  dueThisMonth: CounterpartySummaryBucket;
  expectedBack: CounterpartySummaryBucket;
}

/** One entry with its bank-debit/credit candidates. */
export interface LendingTransferSuggestion {
  lendingId: string;
  direction: LendingDirection;
  amount: number;
  entryDate: string;
  expectedReturnDate?: string | null;
  notes?: string | null;
  candidates: Transaction[];
}

/** One person's entries that look like unlinked bank transfers (GET /counterparties/match-suggestions). */
export interface CounterpartyMatchSuggestions {
  counterpartyId: string;
  counterpartyName: string;
  suggestions: LendingTransferSuggestion[];
}

/** One bank transfer that names a person who has no entry for it (GET /counterparties/unrecorded-transfers). */
export interface UnrecordedTransfer {
  counterpartyId: string;
  counterpartyName: string;
  /** The settlement entry's direction: borrowed = money in (they paid you), lent = money out. */
  direction: LendingDirection;
  transaction: Transaction;
}
