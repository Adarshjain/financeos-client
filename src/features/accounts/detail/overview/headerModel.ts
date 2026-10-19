import {
  formatAmount,
  formatDayMonth,
  formatDayMonthYear,
  formatRupees,
} from '@/features/accounts/list/accountsList';
import { deriveBillCardState } from '@/features/bills/billCardState';
import { type Account, isAccountClosed } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
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
  showImport: boolean;
}

const MARKABLE = new Set(['OPEN', 'PARTIAL', 'OVERDUE']);

function cardHeader(
  account: Extract<Account, { type: AccountType.CREDIT_CARD }>,
  bill: CardBillResponse | null | undefined,
  today: string,
  closed: boolean
): Pick<HeaderModel, 'label' | 'figure' | 'badge' | 'caption' | 'markPaid'> {
  const balance = account.balance ?? 0;
  const owed = formatRupees(Math.max(0, -balance));
  const inCredit = balance > 0;
  if (!bill) {
    return {
      label: inCredit ? 'In credit' : 'You owe',
      figure: inCredit ? formatRupees(balance) : owed,
      caption: [],
      markPaid: null,
    };
  }
  const state = deriveBillCardState(bill, today);
  const unbilled = state.unbilled != null ? Math.max(0, state.unbilled) : null;

  if (state.phase === 'awaiting') {
    const caption: string[] = [];
    if (bill.nextStatementExpectedOn) {
      caption.push(`next statement ${formatDayMonth(bill.nextStatementExpectedOn)}`);
    }
    if (bill.status === 'PAID' && bill.totalAmountDue != null) {
      caption.push(
        bill.paidMarkedOn
          ? `last bill ${formatRupees(bill.totalAmountDue)} paid ${formatDayMonth(bill.paidMarkedOn)}`
          : `last bill ${formatRupees(bill.totalAmountDue)}`
      );
    }
    return {
      label: 'Unbilled so far',
      figure: formatRupees(unbilled ?? 0),
      badge: 'No bill due',
      caption,
      markPaid: null,
    };
  }

  const caption: string[] = [];
  if (bill.paymentDueDate) caption.push(`due ${formatDayMonth(bill.paymentDueDate)}`);
  if (unbilled != null) caption.push(`unbilled ${formatRupees(unbilled)}`);
  return {
    label: inCredit ? 'In credit' : 'You owe',
    figure: inCredit ? formatRupees(balance) : owed,
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
  today: string
): HeaderModel {
  const closed = isAccountClosed(account, today);
  const closedLabel =
    closed && account.closedOn
      ? `Closed ${formatDayMonthYear(account.closedOn)}`
      : undefined;

  if (account.type === AccountType.CREDIT_CARD) {
    return {
      ...cardHeader(account, bill, today, closed),
      closedLabel,
      showImport: !closed,
    };
  }

  const caption: string[] = [];
  if (account.balanceAnchored && account.anchorDate) {
    caption.push(`as of statement ${formatDayMonth(account.anchorDate)}`);
  }
  if (account.type === AccountType.BROKER) {
    return {
      label: 'Portfolio value',
      figure: formatRupees(account.balance ?? 0),
      caption,
      closedLabel,
      markPaid: null,
      showImport: false,
    };
  }
  if (account.type === AccountType.BANK_ACCOUNT) {
    const opening = account.openingBalance != null ? Number(account.openingBalance) : 0;
    return {
      label: 'Balance',
      figure: formatRupees(account.balance ?? (Number.isFinite(opening) ? opening : 0)),
      caption,
      closedLabel,
      markPaid: null,
      showImport: !closed,
    };
  }
  return {
    label: 'Balance',
    figure: formatRupees(account.balance ?? 0),
    caption,
    closedLabel,
    markPaid: null,
    showImport: false,
  };
}

/** "₹1,234" or "₹1,234.50": the reconciliation gap as the banner states it; null when there is none. */
export function reconciliationBanner(gap: number | null | undefined): string | null {
  if (gap == null || !Number.isFinite(gap) || gap === 0) return null;
  const abs = Math.abs(gap);
  const text = Number.isInteger(abs) ? formatRupees(abs) : `₹${formatAmount(abs, 2)}`;
  return `Transactions and the latest statement disagree by ${text}.`;
}
