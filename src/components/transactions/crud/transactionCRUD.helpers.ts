import {
  Account,
  isAccountClosed,
  isCardholderClosed,
} from '@/lib/account.types';
import {
  ReviewType,
  Transaction,
  TransactionChannel,
  TransactionRequest,
  TransactionSource,
} from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

/** Accounts selectable in the account picker: open non-broker accounts, plus
 * the transaction's own (possibly closed) account so editing never hides it. */
export function getSelectableAccounts(
  accounts: Account[],
  transaction?: Transaction
): Account[] {
  return accounts.filter(
    (a) =>
      (a.type !== AccountType.BROKER && !isAccountClosed(a)) ||
      a.id === transaction?.accountId
  );
}

/** Card options for the selected account: open cards (plus the transaction's
 * own card, even if since closed) labeled by cardholder.
 *
 * Recomputes the credit-card/bank-account check locally (rather than taking
 * it as a boolean parameter) so TS's control-flow analysis can narrow
 * `selectedAccount` to the cardholder-bearing variants before the property
 * access below — a plain boolean parameter doesn't carry that narrowing. */
export function getCardOptions(
  selectedAccount: Account | undefined,
  isBank: boolean,
  transaction?: Transaction
): { id: string; label: string }[] {
  const supportsCards =
    selectedAccount?.type === AccountType.CREDIT_CARD ||
    selectedAccount?.type === AccountType.BANK_ACCOUNT;
  if (!supportsCards) return [];
  return (selectedAccount.cardholders ?? []).flatMap((ch) =>
    (ch.cards ?? [])
      .filter(
        (c) =>
          (!c.closedOn && !isCardholderClosed(ch)) ||
          c.id === transaction?.cardId
      )
      .map((c) => ({
        id: c.id,
        label: `${ch.personName || (ch.role === 'PRIMARY' ? (isBank ? 'Your card' : 'You') : (isBank ? 'Joint holder' : 'Add-on'))} (•••• ${c.last4})`,
      }))
  );
}

/** Default card to select when switching to a given account: the primary
 * cardholder's open card, else any open card on the account, else none. */
export function getDefaultCardIdForAccount(
  account: Account | undefined
): string | null {
  if (account?.type !== AccountType.CREDIT_CARD) return null;
  const cardholders = account.cardholders ?? [];
  const primaryOpenCard = cardholders
    .find((ch) => ch.role === 'PRIMARY')
    ?.cards?.find((c) => !c.closedOn);
  const anyOpenCard = cardholders
    .filter((ch) => !isCardholderClosed(ch))
    .flatMap((ch) => ch.cards ?? [])
    .find((c) => !c.closedOn);
  return primaryOpenCard?.id ?? anyOpenCard?.id ?? null;
}

export function computeHasRewardDetails(transaction?: Transaction): boolean {
  return (
    transaction?.settlementDate != null ||
    transaction?.instantDiscount != null ||
    transaction?.convenienceFee != null ||
    transaction?.channel != null ||
    !!transaction?.isEmi ||
    !!transaction?.isInternational
  );
}

/** Parses a free-text amount field: empty stays `null` (no value), otherwise
 * must be a non-negative number or the field-specific error is returned. */
export function parseNonNegativeAmount(
  raw: string,
  label: string
): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };
  const value = Number(trimmed);
  if (Number.isNaN(value) || value < 0) {
    return { value: null, error: `${label} must be a non-negative number.` };
  }
  return { value, error: null };
}

export interface BuildTransactionRequestParams {
  accountId: string;
  cardId: string | null;
  supportsCards: boolean;
  description: string;
  amount: string;
  categoryIds: string[];
  date: Date;
  isExcluded: boolean;
  isMonitored: boolean;
  monitoringReason: string;
  mcc: string;
  isUpdateMode: boolean;
  source?: TransactionSource;
  settlementDate?: Date;
  instantDiscount: number | null;
  convenienceFee: number | null;
  channel: TransactionChannel | 'NONE';
  isEmi: boolean;
  isInternational: boolean;
  reviewType: ReviewType;
}

export function buildTransactionRequest(
  p: BuildTransactionRequestParams
): TransactionRequest {
  const request: TransactionRequest = {
    accountId: p.accountId,
    cardId: p.supportsCards ? p.cardId || null : null,
    description: p.description ?? undefined,
    amount: Number(p.amount),
    categoryIds: p.categoryIds,
    date: toCalendarDate(p.date),
    isTransactionExcluded: p.isExcluded,
    isTransactionUnderMonitoring: p.isMonitored,
    monitoringReason: p.isMonitored ? p.monitoringReason : undefined,
    mcc: p.mcc || (p.isUpdateMode ? '' : undefined),
    rewardDetails: {
      settlementDate: p.settlementDate
        ? toCalendarDate(p.settlementDate)
        : null,
      instantDiscount: p.instantDiscount,
      convenienceFee: p.convenienceFee,
      channel: p.channel === 'NONE' ? null : p.channel,
      isEmi: p.isEmi || null,
      isInternational: p.isInternational || null,
    },
  };
  if (p.isUpdateMode) {
    request.source = p.source ?? 'manual';
    request.reviewType = p.reviewType;
  }
  return request;
}
