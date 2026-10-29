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
  /** Danger while the headline is money you owe. */
  figureTone?: 'danger';
  /** The one fact beside the actions: "Closed 30 Jun 2026", "Next statement 5 Nov" or "as of 10 Oct". */
  info?: string;
  markPaid: MarkPaidTarget | null;
}

const MARKABLE = new Set(['OPEN', 'PARTIAL', 'OVERDUE']);

function cardHeader(
  account: Extract<Account, { type: AccountType.CREDIT_CARD }>,
  bill: CardBillResponse | null | undefined,
  today: string,
  closed: boolean
): Pick<HeaderModel, 'label' | 'figure' | 'figureTone' | 'info' | 'markPaid'> {
  const balance = account.balance ?? 0;
  const owed = formatMoney(Math.max(0, -balance));
  const inCredit = balance > 0;
  if (!bill) {
    return {
      label: inCredit ? 'In credit' : 'Amount you owe',
      figure: inCredit ? formatMoney(balance) : owed,
      figureTone: balance < 0 ? 'danger' : undefined,
      markPaid: null,
    };
  }
  const state = deriveBillCardState(bill, today);
  const unbilled = state.unbilled != null ? Math.max(0, state.unbilled) : null;
  const info = bill.nextStatementExpectedOn ? `Next statement ${formatDate(bill.nextStatementExpectedOn, 'list')}` : undefined;

  if (state.phase === 'awaiting') {
    return {
      label: 'Unbilled so far',
      figure: formatMoney(unbilled ?? 0),
      info,
      markPaid: null,
    };
  }

  return {
    label: inCredit ? 'In credit' : 'Amount you owe',
    figure: inCredit ? formatMoney(balance) : owed,
    figureTone: balance < 0 ? 'danger' : undefined,
    info,
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
  const closedInfo = closed && account.closedOn ? `Closed ${formatDate(account.closedOn, 'full')}` : undefined;

  if (account.type === AccountType.CREDIT_CARD) {
    const card = cardHeader(account, bill, today, closed);
    return { ...card, info: closedInfo ?? card.info };
  }

  let info: string | undefined;
  if (account.type !== AccountType.GENERIC && account.balanceAnchored && account.anchorDate) {
    // Later transactions are added on top of the statement balance, so the balance is current to the newest one.
    const latest = account.lastTransactionDate;
    const current = latest && latest > account.anchorDate && latest <= today ? latest : null;
    info = current ? `as of ${formatDate(current, 'relative', { today, inline: true })}` : `as of statement ${formatDate(account.anchorDate, 'relative', { today, inline: true })}`;
  }
  if (account.type === AccountType.BROKER) {
    return {
      label: 'Portfolio value',
      figure: formatMoney(account.balance ?? 0),
      info: closedInfo ?? info,
      markPaid: null,
    };
  }
  if (account.type === AccountType.BANK_ACCOUNT) {
    const opening = account.openingBalance != null ? Number(account.openingBalance) : 0;
    return {
      label: 'Balance',
      figure: formatMoney(account.balance ?? (Number.isFinite(opening) ? opening : 0)),
      info: closedInfo ?? info,
      markPaid: null,
    };
  }
  if (!info && lastEntry) info = `last entry ${formatDate(lastEntry, 'list')}`;
  return {
    label: 'Balance',
    figure: formatMoney(account.balance ?? 0),
    info: closedInfo ?? info,
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
