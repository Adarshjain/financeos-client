import type {
  Card,
  Cardholder,
  CardholderRelationship,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { amountExpressionValue } from '@/lib/amountExpression';
import type { BulkReattributeCardRequest } from '@/lib/transaction.types';

export type Built<T> = { ok: true; body: T } | { ok: false; errors: Record<string, string> };

/** "The issued date cannot be in the future" for a date after today, else null. */
export function futureDateError(noun: string, value: string, today: string): string | null {
  return value && value > today ? `Pick the ${noun} date on or before today.` : null;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** The spend limit as a number (arithmetic evaluated); null when blank or not a usable amount. */
function spendLimitOf(value: string): number | null {
  return amountExpressionValue(value);
}

const SPEND_LIMIT_ERROR = 'Enter the limit as a number, like 50,000.';

/** An error when the spend limit text is filled in but is not a usable amount (e.g. "5+" or "100/0"). */
function spendLimitError(value: string): string | null {
  return value.trim() && spendLimitOf(value) === null ? SPEND_LIMIT_ERROR : null;
}

function result<T>(errors: Record<string, string>, body: T): Built<T> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, body };
}

export interface AddCardValues {
  last4: string;
  issuedOn: string;
  /** The suggestion this card is added from; sent only when set. */
  fromSuggestionId?: string;
}

const fromSuggestion = (id: string | undefined) => (id ? { fromSuggestionId: id } : {});

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
  return result(errors, { last4: v.last4.trim(), issuedOn: v.issuedOn || undefined, ...fromSuggestion(v.fromSuggestionId) });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "May 2021" for a yyyy-mm-dd date (read as written, no time zone). */
function monthYearOf(date: string): string {
  const [y, m] = date.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim();
}

/** "Seen in 63 emails and 100 transactions, May 2021 – Apr 2025"; null when the number was never seen. */
export function seenHint(d: { firstSeen?: string | null; lastSeen?: string | null; mailCount: number; transactionCount: number }): string | null {
  if (d.mailCount === 0 && d.transactionCount === 0) return null;
  const n = (c: number, one: string, many: string) => `${c} ${c === 1 ? one : many}`;
  const counts = [d.mailCount > 0 ? n(d.mailCount, 'email', 'emails') : null, d.transactionCount > 0 ? n(d.transactionCount, 'transaction', 'transactions') : null]
    .filter(Boolean)
    .join(' and ');
  const first = d.firstSeen ? monthYearOf(d.firstSeen) : '';
  const last = d.lastSeen ? monthYearOf(d.lastSeen) : '';
  const span = first && last ? (first === last ? first : `${first} – ${last}`) : first || last;
  return `Seen in ${counts}${span ? `, ${span}` : ''}`;
}

export interface PastCardValues {
  last4: string;
  issuedOn: string;
  closedOn: string;
}

/** A card that was already closed: both dates are needed, opened on or before closed, neither in the future. */
export function buildPastCard(v: PastCardValues, today: string, last4Message = 'Last 4 digits must be exactly 4 digits.'): Built<CreateCardRequest> {
  const errors: Record<string, string> = {};
  if (v.last4.length !== 4) errors.last4 = last4Message;
  if (!v.issuedOn) errors.issuedOn = 'Enter when the card was opened.';
  else {
    const opened = futureDateError('opened', v.issuedOn, today);
    if (opened) errors.issuedOn = opened;
  }
  if (!v.closedOn) errors.closedOn = 'Enter when the card was closed.';
  else {
    const closed = futureDateError('closed', v.closedOn, today);
    if (closed) errors.closedOn = closed;
    else if (v.issuedOn && v.closedOn < v.issuedOn) errors.closedOn = 'Pick a closed date on or after the opened date.';
  }
  return result(errors, { last4: v.last4.trim(), issuedOn: v.issuedOn || undefined, closedOn: v.closedOn || undefined });
}

export interface AddHolderValues {
  name: string;
  /** '' until one is picked (an add-on from a suggestion has no default). */
  relationship: CardholderRelationship | '';
  spendLimit: string;
  openedOn: string;
  last4: string;
  issuedOn: string;
  /** The suggestion this holder is added from; sent only when set. */
  fromSuggestionId?: string;
}

export function buildAddHolder(v: AddHolderValues, today: string): Built<CreateCardholderRequest> {
  const errors: Record<string, string> = {};
  if (!v.name.trim()) errors.name = 'Cardholder name is required.';
  if (!v.relationship) errors.relationship = 'Pick who the holder is.';
  if (v.last4 && v.last4.length !== 4) errors.last4 = 'Card last 4 digits must be exactly 4 digits.';
  const limit = spendLimitError(v.spendLimit);
  if (limit) errors.spendLimit = limit;
  const opened = futureDateError('opened', v.openedOn, today);
  if (opened) errors.openedOn = opened;
  const issued = v.last4 ? futureDateError('issued', v.issuedOn, today) : null;
  if (issued) errors.issuedOn = issued;
  return result(errors, {
    personName: v.name.trim(),
    relationship: v.relationship || undefined,
    spendLimit: spendLimitOf(v.spendLimit),
    last4: v.last4.trim() || undefined,
    openedOn: v.openedOn || undefined,
    issuedOn: v.last4 ? v.issuedOn || v.openedOn || undefined : undefined,
    ...fromSuggestion(v.fromSuggestionId),
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
  const limit = spendLimitError(v.spendLimit);
  if (limit) errors.spendLimit = limit;
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
  /** The suggestion this replacement is added from; sent only when set. */
  fromSuggestionId?: string;
}

export function buildReplaceCard(v: ReplaceCardValues, today: string): Built<ReplaceCardRequest> {
  const errors: Record<string, string> = {};
  if (v.newLast4.length !== 4) errors.newLast4 = 'New last 4 digits must be exactly 4 digits.';
  const date = futureDateError('issued', v.issuedOn, today);
  if (date) errors.issuedOn = date;
  return result(errors, { newLast4: v.newLast4.trim(), issuedOn: v.issuedOn || undefined, ...fromSuggestion(v.fromSuggestionId) });
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
