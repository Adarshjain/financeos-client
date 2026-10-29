import { deriveBillCardState } from '@/features/bills/billCardStateModel';
import { type Account, isAccountClosed } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';
import { AccountType } from '@/lib/types';

export interface MarkPaidTarget {
  statementId: string;
  /** What is left to pay; null when the statement carries no amount. */
  remaining: number | null;
}

export interface HeaderModel {
  label: string;
  figure: string;
  /** Neutral badge before the caption ("No bill due"). */
  badge?: string;
  /** Caption parts, joined with " · ". */
  caption: string[];
  /** "Closed 30 Jun 2026" for a closed account. */
  closedLabel?: string;
  markPaid: MarkPaidTarget | null;
}

const MARKABLE = new Set(['OPEN', 'PARTIAL', 'OVERDUE']);

function cardHeader(
  account: Extract<Account, { type: AccountType.CREDIT_CARD }>,
  bill: CardBillResponse | null | undefined,
  today: string,
  closed: boolean
): Pick<HeaderModel, 'label' | 'figure' | 'badge' | 'caption' | 'markPaid'> {
  const balance = account.balance ?? 0;
  const owed = formatMoney(Math.max(0, -balance));
  const inCredit = balance > 0;
  if (!bill) {
    return {
      label: inCredit ? 'In credit' : 'You owe',
      figure: inCredit ? formatMoney(balance) : owed,
      caption: [],
      markPaid: null,
    };
  }
  const state = deriveBillCardState(bill, today);
  const unbilled = state.unbilled != null ? Math.max(0, state.unbilled) : null;

  if (state.phase === 'awaiting') {
    const caption: string[] = [];
    if (bill.nextStatementExpectedOn) {
      caption.push(`next statement ${formatDate(bill.nextStatementExpectedOn, 'list')}`);
    }
    if (bill.status === 'PAID' && bill.totalAmountDue != null) {
      caption.push(
        bill.paidMarkedOn
          ? `last bill ${formatMoney(bill.totalAmountDue)} paid ${formatDate(bill.paidMarkedOn, 'list')}`
          : `last bill ${formatMoney(bill.totalAmountDue)}`
      );
    }
    return {
      label: 'Unbilled so far',
      figure: formatMoney(unbilled ?? 0),
      badge: 'No bill due',
      caption,
      markPaid: null,
    };
  }

  const caption: string[] = [];
  if (bill.paymentDueDate) caption.push(`due ${formatDate(bill.paymentDueDate, 'list')}`);
  if (unbilled != null) caption.push(`unbilled ${formatMoney(unbilled)}`);
  return {
    label: inCredit ? 'In credit' : 'You owe',
    figure: inCredit ? formatMoney(balance) : owed,
    caption,
    markPaid:
      !closed && MARKABLE.has(bill.status) && bill.statementId
        ? { statementId: bill.statementId, remaining: state.toPay }
        : null,
  };
}

/** What the header block shows for any account type. `bill` is the card's current bill (cards only). */
export function buildHeaderModel(
  account: Account,
  bill: CardBillResponse | null | undefined,
  today: string,
  /** Newest entry date, for a wallet's "last entry". */
  lastEntry?: string | null
): HeaderModel {
  const closed = isAccountClosed(account, today);
  const closedLabel =
    closed && account.closedOn
      ? `Closed ${formatDate(account.closedOn, 'full')}`
      : undefined;

  if (account.type === AccountType.CREDIT_CARD) {
    return {
      ...cardHeader(account, bill, today, closed),
      closedLabel,
    };
  }

  const caption: string[] = [];
  if (account.type !== AccountType.GENERIC && account.balanceAnchored && account.anchorDate) {
    // Later transactions are added on top of the statement balance, so the balance is current to the newest one.
    const latest = account.lastTransactionDate;
    const current = latest && latest > account.anchorDate && latest <= today ? latest : null;
    caption.push(current ? `as of ${formatDate(current, 'relative', { today, inline: true })}` : `as of statement ${formatDate(account.anchorDate, 'relative', { today, inline: true })}`);
  }
  if (account.type === AccountType.BROKER) {
    if (account.cashBalance !== undefined) caption.push(`cash ${formatMoney(account.cashBalance)}`);
    return {
      label: 'Portfolio value',
      figure: formatMoney(account.balance ?? 0),
      caption,
      closedLabel,
      markPaid: null,
    };
  }
  if (account.type === AccountType.BANK_ACCOUNT) {
    const opening = account.openingBalance != null ? Number(account.openingBalance) : 0;
    return {
      label: 'Balance',
      figure: formatMoney(account.balance ?? (Number.isFinite(opening) ? opening : 0)),
      caption,
      closedLabel,
      markPaid: null,
    };
  }
  caption.push('Manual balance');
  if (lastEntry) caption.push(`last entry ${formatDate(lastEntry, 'list')}`);
  return {
    label: 'Balance',
    figure: formatMoney(account.balance ?? 0),
    caption,
    closedLabel,
    markPaid: null,
  };
}

export interface DisagreementBanner {
  /** Bold lead-in: "Statement and ledger disagree by ₹1,200." */
  title: string;
  body: string;
}

/** The ledger-disagree banner (info only); null when there is no gap. */
export function reconciliationBanner(gap: number | null | undefined): DisagreementBanner | null {
  if (gap == null || !Number.isFinite(gap) || gap === 0) return null;
  const abs = Math.abs(gap);
  const text = formatMoney(abs, { decimals: 'auto' });
  return {
    title: `Statement and ledger disagree by ${text}.`,
    body: 'Usually a missing opening balance or a duplicated transfer.',
  };
}
