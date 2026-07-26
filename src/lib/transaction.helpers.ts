import type { CreateTransactionLinkRequest } from '@/lib/transaction.types';

/**
 * Normalise a transaction-link request before it goes on the wire: keep only the
 * fields the API expects, trim the note, and omit optional fields that carry no
 * value.
 *
 * Extracted from the server action so it can be tested — `'use server'` modules
 * may only export async functions, so this could not live there.
 *
 * Historical note: this previously also compared `note` against the literal
 * string `'$undefined'` (React's Flight sentinel for `undefined`). That guard was
 * present from the original transaction-linking commit and protected against
 * nothing reachable — the only caller holds `note` in `useState('')` and assigns
 * it as `note.trim()` only when non-empty, so it is always either absent or a
 * trimmed non-empty string. Worse, it was mildly harmful: a user who genuinely
 * typed "$undefined" as their note had it silently dropped. Removed.
 */
export function sanitizeCreateLinkRequest(
  request: CreateTransactionLinkRequest,
): CreateTransactionLinkRequest {
  const clean: CreateTransactionLinkRequest = {
    type: request.type,
    members: request.members,
  };

  const note = request.note?.trim();
  if (note) clean.note = note;

  // Only forward an explicit boolean; `undefined` means "let the server decide".
  if (typeof request.alignRefundCategories === 'boolean') {
    clean.alignRefundCategories = request.alignRefundCategories;
  }

  return clean;
}

export type LinkType = 'TRANSFER' | 'CC_PAYMENT' | 'REFUND' | 'REVERSAL' | 'FEE' | 'EMI';

/**
 * Derive the human-facing role label for a transaction link member
 * based on the link type and whether the member is the anchor.
 */
export function getDerivedRoleLabel(type: LinkType, isAnchor: boolean): string {
  switch (type) {
    case 'TRANSFER':
      return isAnchor ? 'Transfer out' : 'Transfer in';
    case 'CC_PAYMENT':
      return isAnchor ? 'Card bill payment' : 'Payment credited';
    case 'REFUND':
      return isAnchor ? 'Refunded purchase' : 'Refund';
    case 'REVERSAL':
      return isAnchor ? 'Reversed' : 'Reversal';
    case 'FEE':
      return isAnchor ? 'Parent charge' : 'Fee';
    case 'EMI':
      return isAnchor ? 'Purchase (EMI)' : 'Installment';
    default:
      return isAnchor ? 'Parent' : 'Counterpart';
  }
}

