import {
  formatAmount,
  formatDayMonth,
  formatRupees,
} from '@/features/accounts/list/accountsList';
import type { Broker, GenericAccount } from '@/lib/account.types';
import type { StatementSummary } from '@/lib/statement.types';
import type { Transaction } from '@/lib/transaction.types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 2026" from a calendar date (YYYY-MM-DD); empty when it is not a date. */
export function formatMonthYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

/** "5th", "22nd", "11th". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "₹1,234" or "₹1,234.50": paise only when there are some. */
export function formatRupeesExact(value: number): string {
  return Number.isInteger(value) ? formatRupees(value) : `₹${formatAmount(value, 2)}`;
}

// ---- 90-day flow ------------------------------------------------------------

export interface FlowInput {
  moneyIn: number;
  moneyOut: number;
  averageDailyBalance?: number | null;
  interestLastQuarter: number;
  topInCategories: string[];
  topOutCategories: string[];
}

export interface KpiModel {
  label: string;
  value: string;
  context?: string;
}

/** The three tiles above the bank's recent transactions. */
export function buildFlowKpis(flow: FlowInput): KpiModel[] {
  const joinTop = (names: string[]) => (names.length > 0 ? names.slice(0, 3).join(', ') : undefined);
  return [
    {
      label: 'In · 90 days',
      value: `+${formatRupees(flow.moneyIn)}`,
      context: joinTop(flow.topInCategories),
    },
    {
      label: 'Out · 90 days',
      value: formatRupees(flow.moneyOut),
      context: joinTop(flow.topOutCategories),
    },
    {
      label: 'Avg daily balance',
      value: flow.averageDailyBalance != null ? formatRupees(flow.averageDailyBalance) : '—',
      context:
        flow.interestLastQuarter > 0
          ? `interest ${formatRupees(flow.interestLastQuarter)} last quarter`
          : undefined,
    },
  ];
}

// ---- Latest statement -------------------------------------------------------

export interface StatementRowModel {
  id: string;
  title: string;
  caption: string;
  /** True when this statement is the one the balance is anchored to and the ledger disagrees with it. */
  gap: boolean;
}

/** The newest statement as one row; null when there are none. */
export function buildLatestStatement(
  statements: readonly StatementSummary[],
  account: { anchorDate?: string | null; reconciliationGap?: number | null }
): StatementRowModel | null {
  const latest = [...statements].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  if (!latest) return null;
  const parts = [`${latest.transactionCount} ${latest.transactionCount === 1 ? 'row' : 'rows'}`];
  if (latest.closingBalance != null) parts.push(`closing ${formatRupeesExact(latest.closingBalance)}`);
  const uploaded = formatDayMonth(latest.createdAt.slice(0, 10));
  if (uploaded) parts.push(`uploaded ${uploaded}`);
  return {
    id: latest.id,
    title: formatMonthYear(latest.periodEnd),
    caption: parts.join(' · '),
    gap:
      !!account.reconciliationGap &&
      account.reconciliationGap !== 0 &&
      account.anchorDate === latest.periodEnd,
  };
}

// ---- Gmail alerts -----------------------------------------------------------

export interface GmailCardModel {
  subtitle?: string;
  active: boolean;
  /** "—" when the Gmail summary request failed. */
  lastAlert?: string;
  unmatched?: number;
}

export function buildGmailCard(input: {
  ingestFromDate: string | null | undefined;
  lastAlert: { description: string; amount: number; date: string } | null | undefined;
  unmatchedCount: number | null | undefined;
  today: string;
}): GmailCardModel {
  const since = input.ingestFromDate ? formatDayMonth(input.ingestFromDate) : '';
  const alert = input.lastAlert;
  return {
    subtitle: since ? `Since ${since}` : undefined,
    active: !!input.ingestFromDate,
    lastAlert: input.unmatchedCount == null && !alert
      ? '—'
      : alert
      ? `${alert.description} ${formatRupeesExact(Math.abs(alert.amount))} · ${
          alert.date === input.today ? 'today' : formatDayMonth(alert.date)
        }`
      : undefined,
    unmatched: input.unmatchedCount && input.unmatchedCount > 0 ? input.unmatchedCount : undefined,
  };
}

// ---- Linked: what pays from this account ------------------------------------

export interface LinkedLine {
  key: string;
  label: string;
  value: string;
}

export function buildLinked(payments: {
  emis: { loanId: string; name: string; amount: number; nextDueDate?: string | null }[];
  cardBills: { accountId: string; name: string }[];
}): LinkedLine[] {
  const lines: LinkedLine[] = payments.emis.map((emi) => {
    const day = emi.nextDueDate ? Number(emi.nextDueDate.slice(8, 10)) : NaN;
    return {
      key: emi.loanId,
      label: emi.name,
      value: Number.isFinite(day)
        ? `${formatRupees(emi.amount)} on the ${ordinal(day)}`
        : formatRupees(emi.amount),
    };
  });
  if (payments.cardBills.length > 0) {
    lines.push({
      key: 'card-bills',
      label: 'Card bills',
      value: payments.cardBills.map((b) => b.name).join(', '),
    });
  }
  return lines;
}

// ---- Wallet / cash ----------------------------------------------------------

export interface DetailLine {
  label: string;
  value: string;
}

/** "Net worth · asset", "Net worth · liability" or "Excluded from net worth". */
export function countsToward(account: Pick<GenericAccount, 'excludeFromNetAsset' | 'financialPosition'>): string {
  if (account.excludeFromNetAsset) return 'Excluded from net worth';
  return `Net worth · ${account.financialPosition === 'liability' ? 'liability' : 'asset'}`;
}

export function buildWalletDetails(account: GenericAccount): DetailLine[] {
  const lines: DetailLine[] = [
    { label: 'Type', value: 'Wallet / cash' },
    { label: 'Counts toward', value: countsToward(account) },
  ];
  if (account.description) lines.push({ label: 'Description', value: account.description });
  return lines;
}

// ---- Broker -----------------------------------------------------------------

export interface BrokerCashModel {
  /** "—" when the account carries no cash balance. */
  available: string;
  /** "₹25,000 · 7 Oct · Transfer from ICICI"; undefined without a linked-transfer credit in the recent transactions. */
  lastTransferIn?: string;
}

export function buildBrokerCash(account: Broker, recent: readonly Transaction[] | null): BrokerCashModel {
  const credit = [...(recent ?? [])]
    .filter((t) => t.amount > 0 && t.links?.some((l) => l.type === 'TRANSFER'))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const parts = credit
    ? [formatRupeesExact(credit.amount), formatDayMonth(credit.date), credit.description || credit.sourcedDescription]
    : [];
  return {
    available: account.cashBalance !== undefined ? formatRupees(account.cashBalance) : '—',
    lastTransferIn: credit ? parts.filter(Boolean).join(' · ') : undefined,
  };
}

/** The newest transaction date, for the wallet header; null without any. */
export function lastEntryDate(recent: readonly Transaction[] | null | undefined): string | null {
  if (!recent || recent.length === 0) return null;
  return recent.reduce((max, t) => (t.date > max ? t.date : max), recent[0].date);
}
