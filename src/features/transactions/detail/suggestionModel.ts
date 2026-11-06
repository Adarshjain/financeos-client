import type { Schemas } from '@/lib/api/types';
import type { Transaction } from '@/lib/transaction.types';

type Suggestion = Schemas['TransactionSuggestion'];
type Kind = Suggestion['kind'];
type Candidate = Schemas['Candidate'];

/** The kinds the panel can act on; EMI and DIVIDEND suggestions only show their line on the row. */
export function isActionable(kind: Kind): boolean {
  return kind === 'TRANSFER' || kind === 'CC_PAYMENT' || kind === 'REFUND' || kind === 'LENDING';
}

export const acceptLabel = (kind: Kind) => (kind === 'LENDING' ? 'Settle' : 'Link');
export const acceptedWord = (kind: Kind) => (kind === 'LENDING' ? 'Settled' : 'Linked');
export const dismissLabel = (kind: Kind) => (kind === 'REFUND' ? 'Not a refund' : 'Not this');

/**
 * The candidateId an accept sends. A lending suggestion names the lending; a transfer or card payment seen from its
 * credit row names that row itself (the suggestion is stored on the debit side); a refund names the candidate.
 */
export function candidateIdFor(kind: Kind, t: Pick<Transaction, 'id' | 'amount'>, c: Candidate): string | null {
  if (kind === 'LENDING') return c.lendingId ?? null;
  if ((kind === 'TRANSFER' || kind === 'CC_PAYMENT') && t.amount != null && t.amount > 0) return t.id;
  return c.transactionId ?? null;
}
