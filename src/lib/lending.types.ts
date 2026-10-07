// These mirror generated schema shapes field-for-field; re-exported as aliases
// instead of hand-duplicated so a server change can't silently drift the two.
export type {
  CounterpartyResponse,
  CreateCounterpartyRequest,
  CreateLendingRequest,
  LendingResponse,
  ObligationsResponse,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/api/types';
import type { Schemas } from '@/lib/api/types';

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
