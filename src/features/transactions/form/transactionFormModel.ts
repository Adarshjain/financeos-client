import type { Account } from '@/lib/account.types';
import type {
  ReviewReason,
  ReviewType,
  Transaction,
  TransactionChannel,
  TransactionRequest,
} from '@/lib/transaction.types';
import { parseCalendarDate } from '@/lib/utils';

import { isValidMcc } from './mcc';
import { buildTransactionRequest, parseNonNegativeAmount } from './transactionCRUD.helpers';

/** The Card dropdown's "no card" entry. */
export const NO_CARD = 'NONE';
/** The Channel dropdown's "no channel" entry. */
export const NO_CHANNEL = 'NONE';

export type Direction = 'debit' | 'credit';

/** The reasons the server accepts on an edit; there is no "Other". */
export const EDITABLE_REASONS: readonly ReviewReason[] = [
  'UNRECONCILED',
  'CATEGORY_UNVERIFIED',
  'DUPLICATE_SUSPECT',
  'DATE_CORRECTED',
];

export interface TransactionFormValues {
  direction: Direction;
  /** The amount without its sign. */
  amount: string;
  /** YYYY-MM-DD. */
  date: string;
  accountId: string;
  /** A card id, or NO_CARD. */
  cardId: string;
  description: string;
  mcc: string;
  reviewType: ReviewType;
  reviewReasons: ReviewReason[];
  excluded: boolean;
  monitored: boolean;
  monitoringReason: string;
  /** YYYY-MM-DD, or '' when not set. */
  settlementDate: string;
  channel: TransactionChannel | typeof NO_CHANNEL;
  instantDiscount: string;
  convenienceFee: string;
  emi: boolean;
  international: boolean;
}

export type FormField = 'amount' | 'date' | 'accountId' | 'mcc' | 'reviewType' | 'instantDiscount' | 'convenienceFee';
export type FormErrors = Partial<Record<FormField, string>>;

/** The blank Add form: a debit dated today, on the account the user was looking at (if any). */
export function emptyValues(today: string, accountId = ''): TransactionFormValues {
  return {
    direction: 'debit',
    amount: '',
    date: today,
    accountId,
    cardId: NO_CARD,
    description: '',
    mcc: '',
    reviewType: 'MANUALLY_REVIEWED',
    reviewReasons: [],
    excluded: false,
    monitored: false,
    monitoringReason: '',
    settlementDate: '',
    channel: NO_CHANNEL,
    instantDiscount: '',
    convenienceFee: '',
    emi: false,
    international: false,
  };
}

/** The Edit form: every stored field. */
export function valuesFromTransaction(t: Transaction): TransactionFormValues {
  return {
    direction: t.amount > 0 ? 'credit' : 'debit',
    amount: Math.abs(t.amount).toFixed(2),
    date: t.date.slice(0, 10),
    accountId: t.accountId,
    cardId: t.cardId ?? NO_CARD,
    description: t.description ?? '',
    mcc: t.mcc ?? '',
    reviewType: t.reviewType ?? 'MANUALLY_REVIEWED',
    reviewReasons: (t.reviewReasons ?? []).filter((r) => EDITABLE_REASONS.includes(r)),
    excluded: Boolean(t.isTransactionExcluded),
    monitored: Boolean(t.isTransactionUnderMonitoring),
    monitoringReason: t.monitoringReason ?? '',
    settlementDate: t.settlementDate?.slice(0, 10) ?? '',
    channel: t.channel ?? NO_CHANNEL,
    instantDiscount: t.instantDiscount != null ? String(t.instantDiscount) : '',
    convenienceFee: t.convenienceFee != null ? String(t.convenienceFee) : '',
    emi: Boolean(t.isEmi),
    international: Boolean(t.isInternational),
  };
}

/** The account to start Add on: the list's single account filter; none when it filters several or none. */
export function defaultAccountId(accountFilter: readonly string[]): string {
  return accountFilter.length === 1 ? accountFilter[0] : '';
}

/** The amount with its sign: money out is negative. */
export function signedAmount(values: Pick<TransactionFormValues, 'direction' | 'amount'>): number {
  const n = Math.abs(Number(values.amount));
  return values.direction === 'debit' ? -n : n;
}

/**
 * Needs review with no reason ticked. A stored Needs review that never had a reason stays as it is, so
 * editing its category does not force a reason.
 */
export function reasonsMissing(values: TransactionFormValues, original?: Transaction): boolean {
  if (values.reviewType !== 'NEEDS_REVIEW' || values.reviewReasons.length > 0) return false;
  const storedWithNone =
    original?.reviewType === 'NEEDS_REVIEW' &&
    (original.reviewReasons ?? []).filter((r) => EDITABLE_REASONS.includes(r)).length === 0;
  return !storedWithNone;
}

export const REASONS_REQUIRED = 'Pick at least one reason it needs review';

export interface ProblemContext {
  isUpdate: boolean;
  original?: Transaction;
  /** Accounts a transaction can be recorded against. */
  selectableAccounts: readonly Account[];
}

/** What is wrong with the form, by field; empty when it can be saved. Wording follows the Legacy form's toasts. */
export function formProblems(values: TransactionFormValues, ctx: ProblemContext): FormErrors {
  const errors: FormErrors = {};
  const amount = Number(values.amount);
  if (!values.amount.trim() || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than zero';
  if (!values.date) errors.date = 'Pick a date';
  if (!values.accountId) {
    errors.accountId =
      ctx.selectableAccounts.length === 0 ? 'Add an account to save this transaction' : 'Please select an account';
  }
  if (!isValidMcc(values.mcc.trim())) errors.mcc = 'MCC code must be exactly 4 digits (or left empty).';
  const discount = parseNonNegativeAmount(values.instantDiscount, 'Instant discount');
  if (discount.error) errors.instantDiscount = discount.error;
  const fee = parseNonNegativeAmount(values.convenienceFee, 'Convenience fee');
  if (fee.error) errors.convenienceFee = fee.error;
  if (ctx.isUpdate && reasonsMissing(values, ctx.original)) errors.reviewType = REASONS_REQUIRED;
  return errors;
}

export interface RequestContext {
  isUpdate: boolean;
  /** The edited transaction's source; kept as it is. */
  source?: Transaction['source'];
  categoryIds: string[];
  /** The chosen account takes cards (credit card or bank account). */
  supportsCards: boolean;
}

/** The create or update body. Review status and reasons go only on an update; reasons only with Needs review. */
export function buildRequest(values: TransactionFormValues, ctx: RequestContext): TransactionRequest {
  return buildTransactionRequest({
    accountId: values.accountId,
    cardId: values.cardId === NO_CARD ? null : values.cardId,
    supportsCards: ctx.supportsCards,
    description: values.description,
    amount: String(signedAmount(values)),
    categoryIds: ctx.categoryIds,
    date: parseCalendarDate(values.date),
    isExcluded: values.excluded,
    isMonitored: values.monitored,
    monitoringReason: values.monitoringReason,
    mcc: values.mcc.trim(),
    isUpdateMode: ctx.isUpdate,
    source: ctx.source,
    settlementDate: values.settlementDate ? parseCalendarDate(values.settlementDate) : undefined,
    instantDiscount: parseNonNegativeAmount(values.instantDiscount, '').value,
    convenienceFee: parseNonNegativeAmount(values.convenienceFee, '').value,
    channel: values.channel,
    isEmi: values.emi,
    isInternational: values.international,
    reviewType: values.reviewType,
    reviewReasons: values.reviewReasons,
  });
}
