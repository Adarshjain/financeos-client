import type {
  Card,
  Cardholder,
  CardholderRelationship,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import type { BulkReattributeCardRequest } from '@/lib/transaction.types';

export type Built<T> = { ok: true; body: T } | { ok: false; errors: Record<string, string> };

/** "The issued date cannot be in the future" for a date after today, else null. */
export function futureDateError(noun: string, value: string, today: string): string | null {
  return value && value > today ? `The ${noun} date cannot be in the future` : null;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function spendLimitOf(value: string): number | null {
  const n = parseFloat(value);
  return value && Number.isFinite(n) ? n : null;
}

function result<T>(errors: Record<string, string>, body: T): Built<T> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, body };
}

export interface AddCardValues {
  last4: string;
  issuedOn: string;
}

/** Add a card to a holder, or the first debit card of a bank account. */
export function buildAddCard(
  v: AddCardValues,
  today: string,
  message = 'Last 4 digits must be exactly 4 digits.'
): Built<CreateCardRequest> {
  const errors: Record<string, string> = {};
  if (v.last4.length !== 4) errors.last4 = message;
  const date = futureDateError('issued', v.issuedOn, today);
  if (date) errors.issuedOn = date;
  return result(errors, { last4: v.last4.trim(), issuedOn: v.issuedOn || undefined });
}

export interface AddHolderValues {
  name: string;
  relationship: CardholderRelationship;
  spendLimit: string;
  openedOn: string;
  last4: string;
  issuedOn: string;
}

export function buildAddHolder(v: AddHolderValues, today: string): Built<CreateCardholderRequest> {
  const errors: Record<string, string> = {};
  if (!v.name.trim()) errors.name = 'Cardholder name is required.';
  if (v.last4 && v.last4.length !== 4) errors.last4 = 'Card last 4 digits must be exactly 4 digits.';
  const opened = futureDateError('opened', v.openedOn, today);
  if (opened) errors.openedOn = opened;
  const issued = v.last4 ? futureDateError('issued', v.issuedOn, today) : null;
  if (issued) errors.issuedOn = issued;
  return result(errors, {
    personName: v.name.trim(),
    relationship: v.relationship,
    spendLimit: spendLimitOf(v.spendLimit),
    last4: v.last4.trim() || undefined,
    openedOn: v.openedOn || undefined,
    issuedOn: v.last4 ? v.issuedOn || v.openedOn || undefined : undefined,
  });
}

export interface EditHolderValues {
  name: string;
  relationship: CardholderRelationship;
  spendLimit: string;
  openedOn: string;
}

export type EditHolderBody = UpdateCardholderRequest & { openedOn?: string };

export function buildEditHolder(
  holder: Cardholder,
  v: EditHolderValues,
  today: string
): Built<EditHolderBody> {
  const errors: Record<string, string> = {};
  const opened = futureDateError('opened', v.openedOn, today);
  if (opened) errors.openedOn = opened;
  return result(errors, {
    personName: v.name.trim() || undefined,
    relationship: holder.role === 'PRIMARY' ? 'SELF' : v.relationship,
    spendLimit: spendLimitOf(v.spendLimit),
    openedOn: v.openedOn || undefined,
  });
}

export interface ReplaceCardValues {
  newLast4: string;
  issuedOn: string;
}

export function buildReplaceCard(v: ReplaceCardValues, today: string): Built<ReplaceCardRequest> {
  const errors: Record<string, string> = {};
  if (v.newLast4.length !== 4) errors.newLast4 = 'New last 4 digits must be exactly 4 digits.';
  const date = futureDateError('issued', v.issuedOn, today);
  if (date) errors.issuedOn = date;
  return result(errors, { newLast4: v.newLast4.trim(), issuedOn: v.issuedOn || undefined });
}

/** The close date of a card or a cardholder. */
export function buildClose(closedOn: string, today: string): Built<{ closedOn?: string }> {
  const errors: Record<string, string> = {};
  const date = futureDateError('closed', closedOn, today);
  if (date) errors.closedOn = date;
  return result(errors, { closedOn: closedOn || undefined });
}

export const UNATTRIBUTED = 'UNATTRIBUTED';

export interface ReassignValues {
  source: string;
  from: string;
  to: string;
}

/** Moves past transactions to `holder`'s active card (or the card the menu was opened on). */
export function buildReassign(
  accountId: string,
  holder: Cardholder,
  targetCard: Card | undefined,
  v: ReassignValues
): Built<BulkReattributeCardRequest> {
  const cardId = targetCard?.id ?? (holder.cards ?? []).find((c) => !c.closedOn)?.id;
  if (!cardId) {
    return {
      ok: false,
      errors: { form: 'Target cardholder has no valid card to reassign transactions to.' },
    };
  }
  return {
    ok: true,
    body: {
      accountId,
      from: v.from || undefined,
      to: v.to || undefined,
      currentCardId: v.source === UNATTRIBUTED ? null : v.source,
      cardId,
    },
  };
}

/** The sources a reassign can take from: unattributed rows, or any card of another holder. */
export function reassignSources(
  holder: Cardholder,
  all: readonly Cardholder[],
  nameOf: (h: Cardholder) => string
): Array<{ value: string; label: string }> {
  return [
    { value: UNATTRIBUTED, label: 'Not attributed to a cardholder' },
    ...all
      .filter((h) => h.id !== holder.id)
      .flatMap((h) =>
        (h.cards ?? []).map((c) => ({ value: c.id, label: `••${c.last4} · ${nameOf(h)}` }))
      ),
  ];
}
