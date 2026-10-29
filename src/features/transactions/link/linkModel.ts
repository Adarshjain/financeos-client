import type { Schemas } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';
import {
  type CreateTransactionLinkRequest,
  type LinkKind,
  type LinkType,
  type MemberRef,
  type Transaction,
} from '@/lib/transaction.types';

/** What the Type field offers between transactions, in the order of the board. */
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  TRANSFER: 'Transfer (bank / wallet)',
  CC_PAYMENT: 'Credit card bill payment',
  REFUND: 'Refund / partial refund',
  REVERSAL: 'Reversal',
  FEE: 'Fee / surcharge',
  EMI: 'EMI / installment',
};

/** Fees and installments are money-out, so a credit subject is not offered them. */
const DEBIT_ONLY_TYPES: readonly LinkType[] = ['FEE', 'EMI'];

/** The link types to offer between transactions: all of them, minus Fee and EMI when the subject is a credit. */
export function linkTypesFor(subject: Pick<Transaction, 'amount'> | undefined): LinkType[] {
  const all = Object.keys(LINK_TYPE_LABELS) as LinkType[];
  return subject && subject.amount >= 0 ? all.filter((t) => !DEBIT_ONLY_TYPES.includes(t)) : all;
}

/** The records a transaction can be attached to, instead of another transaction. */
export const RECORD_KIND_LABELS = {
  LENDING: 'Lending entry',
  LOAN_PAYMENT: 'Loan payment',
  DIVIDEND: 'Dividend',
  EPF_WITHDRAWAL: 'EPF withdrawal',
} as const;

export type DisabledKinds = Partial<Record<LinkKind, string>>;

/**
 * Which records cannot take this transaction, with the reason shown to the person. Several transactions at
 * once cannot be recorded as one lending, loan payment or dividend.
 */
export function disabledLinkKinds(subject: Transaction | undefined, selectedCount: number): DisabledKinds {
  if (!subject) {
    if (selectedCount > 1) {
      const reason = 'Select a single transaction to record a lending, loan payment or dividend';
      return { LENDING: reason, LOAN_PAYMENT: reason, DIVIDEND: reason, EPF_WITHDRAWAL: reason };
    }
    return {};
  }
  const result: DisabledKinds = {};
  const refs = subject.obligationRefs ?? [];
  if (refs.some((r) => r.kind !== 'LENDING')) result.LENDING = 'Already linked to a loan or dividend record';
  if (refs.length > 0) result.LOAN_PAYMENT = 'Already linked to a ledger/loan record';
  else if (subject.amount >= 0) result.LOAN_PAYMENT = 'Loan payments must be money-out (debit) transactions';
  if (refs.length > 0) result.DIVIDEND = 'Already linked to a ledger/loan/dividend record';
  else if (subject.amount < 0) result.DIVIDEND = 'Dividends must be money-in (credit) transactions';
  if (refs.length > 0) result.EPF_WITHDRAWAL = 'Already linked to a record';
  else if (subject.amount < 0) result.EPF_WITHDRAWAL = 'EPF withdrawals must be money-in (credit) transactions';
  return result;
}

/** The main ("anchor") transaction unless told otherwise: the first money-out one, else the first. */
export function defaultAnchorId(members: readonly Transaction[]): string {
  return (members.find((t) => t.amount < 0) ?? members[0])?.id ?? '';
}

/** The anchor to use: the chosen one while it is still a member, else the default. */
export function effectiveAnchorId(members: readonly Transaction[], chosen: string): string {
  return members.some((t) => t.id === chosen) ? chosen : defaultAnchorId(members);
}

export interface LinkRequestFields {
  type: LinkType;
  members: readonly Pick<Transaction, 'id'>[];
  anchorId: string;
  note: string;
  alignRefundCategories: boolean;
}

/** The POST /transaction-links body. */
export function buildLinkRequest(f: LinkRequestFields): CreateTransactionLinkRequest {
  const members: MemberRef[] = f.members.map((t) => ({ transactionId: t.id, isAnchor: t.id === f.anchorId }));
  const body: CreateTransactionLinkRequest = { type: f.type, members };
  if (f.note.trim()) body.note = f.note.trim();
  if (f.type === 'REFUND') body.alignRefundCategories = f.alignRefundCategories;
  return body;
}

/** What stops a link from being made, or null: at least two transactions and one main one. */
export function linkProblem(memberCount: number, anchorId: string): string | null {
  if (memberCount < 2) return 'Add at least one more transaction to link';
  if (!anchorId) return 'Pick the main transaction';
  return null;
}

type TypeFilter = 'DEBIT' | 'CREDIT' | null;
type CounterpartCandidate = Pick<Schemas['TransactionResponse'], 'amount' | 'accountId'>;

/**
 * Which transactions can be the other side, from the main one (as the old dialog decided): a transfer or card
 * bill payment, a refund and a reversal each take the opposite direction (a transfer on another account, a bill
 * payment on a credit card, a reversal on the same account); a fee and an installment take another debit.
 */
export function counterpartRules(
  type: LinkType,
  reference: Pick<Transaction, 'amount' | 'accountId'> | undefined,
  isCreditCard: (accountId: string) => boolean,
): { type: TypeFilter; accept: (t: CounterpartCandidate) => boolean } {
  if (!reference) return { type: null, accept: () => true };
  const debit = reference.amount < 0;
  const opposite: TypeFilter = debit ? 'CREDIT' : 'DEBIT';
  const isOpposite = (t: CounterpartCandidate) => (t.amount < 0) !== debit;
  switch (type) {
    case 'TRANSFER':
      return { type: opposite, accept: (t) => isOpposite(t) && t.accountId !== reference.accountId };
    case 'CC_PAYMENT':
      // The credit member must sit on a credit card account: a credit elsewhere has no valid other side.
      if (!debit && !isCreditCard(reference.accountId)) return { type: opposite, accept: () => false };
      return {
        type: opposite,
        accept: (t) => isOpposite(t) && (debit ? isCreditCard(t.accountId) : !isCreditCard(t.accountId)),
      };
    case 'REFUND':
      return { type: opposite, accept: isOpposite };
    case 'REVERSAL':
      return { type: opposite, accept: (t) => isOpposite(t) && t.accountId === reference.accountId };
    case 'FEE':
    case 'EMI':
      return { type: 'DEBIT', accept: (t) => t.amount < 0 };
  }
}

/** The empty-list hint of the picker: the rule the candidates follow. */
export function counterpartHint(type: LinkType): string {
  switch (type) {
    case 'TRANSFER':
      return 'A transfer links the opposite direction on a different account.';
    case 'CC_PAYMENT':
      return 'A card bill payment links a credit posted to a credit card account.';
    case 'REFUND':
      return 'A refund links the opposite direction: the purchase and what came back.';
    case 'REVERSAL':
      return 'A reversal links the opposite direction on the same account.';
    case 'FEE':
      return 'A fee links a debit (a charge).';
    case 'EMI':
      return 'An installment links a debit.';
  }
}

export type LinkRole = 'anchor' | 'member';

/** The role words of one member: the board says Purchase and Refund; the other types keep the app's words. */
export function roleLabel(type: LinkType, role: LinkRole): string {
  const anchor = role === 'anchor';
  switch (type) {
    case 'TRANSFER':
      return anchor ? 'Transfer out' : 'Transfer in';
    case 'CC_PAYMENT':
      return anchor ? 'Card bill payment' : 'Payment credited';
    case 'REFUND':
      return anchor ? 'Purchase' : 'Refund';
    case 'REVERSAL':
      return anchor ? 'Reversed' : 'Reversal';
    case 'FEE':
      return anchor ? 'Parent charge' : 'Fee';
    case 'EMI':
      return anchor ? 'Purchase (EMI)' : 'Installment';
  }
}

/** Choosing a role on one row: "main" makes it the anchor; moving the anchor to "other" hands it to another row. */
export function anchorAfterRole(
  members: readonly Transaction[],
  anchorId: string,
  rowId: string,
  role: LinkRole,
): string {
  if (role === 'anchor') return rowId;
  if (rowId !== anchorId) return anchorId;
  return members.find((t) => t.id !== rowId)?.id ?? '';
}

/** The anchor after a member is removed: the same one, or a new default when the anchor left. */
export function anchorAfterRemove(members: readonly Transaction[], anchorId: string, removedId: string): string {
  const rest = members.filter((t) => t.id !== removedId);
  return rest.some((t) => t.id === anchorId) ? anchorId : defaultAnchorId(rest);
}

/** "Refunds ₹24,990 of ₹24,990 · fully refunded"; null unless a refund link has a purchase and refunds. */
export function coverageLine(
  type: LinkType,
  members: readonly Transaction[],
  anchorId: string,
): string | null {
  if (type !== 'REFUND') return null;
  const purchase = members.find((t) => t.id === anchorId);
  if (!purchase || purchase.amount >= 0) return null;
  const refunded = members
    .filter((t) => t.id !== anchorId && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  if (refunded <= 0) return null;
  const paid = Math.abs(purchase.amount);
  const base = `Refunds ${formatMoney(refunded, { decimals: 'auto' })} of ${formatMoney(paid, { decimals: 'auto' })}`;
  if (Math.round((refunded - paid) * 100) === 0) return `${base} · fully refunded`;
  if (refunded > paid) return `${base} · ${formatMoney(refunded - paid, { decimals: 'auto' })} more than the purchase`;
  return `${base} · partly refunded`;
}

/** "Link BigBasket · ₹3,600 to…" for one transaction, "Link 3 transactions" for several. */
export function linkTitle(members: readonly Transaction[]): string {
  if (members.length === 1) {
    const t = members[0];
    return `Link ${t.description || t.sourcedDescription || 'transaction'} · ${formatMoney(Math.abs(t.amount), { decimals: 'auto' })} to…`;
  }
  return `Link ${members.length} transactions`;
}

/** The line under the title: what the chosen kind does. */
export function linkDescription(kind: LinkKind, multi: boolean): string {
  if (kind === 'LENDING') return 'Record it in a lending ledger.';
  if (kind === 'LOAN_PAYMENT') return 'Settle a loan installment.';
  if (kind === 'DIVIDEND') return 'Record a dividend.';
  if (kind === 'EPF_WITHDRAWAL') return 'Record an EPF withdrawal.';
  return multi ? 'Picked from the selection; give each one its role.' : 'One place for everything that explains this transaction.';
}
