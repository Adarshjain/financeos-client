import type { Broker } from '@/lib/account.types';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import type { StatementSummary } from '@/lib/statement.types';
import type { Transaction } from '@/lib/transaction.types';

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
      value: `+${formatMoney(flow.moneyIn)}`,
      context: joinTop(flow.topInCategories),
    },
    {
      label: 'Out · 90 days',
      value: formatMoney(flow.moneyOut),
      context: joinTop(flow.topOutCategories),
    },
    {
      label: 'Avg daily balance',
      value: flow.averageDailyBalance != null ? formatMoney(flow.averageDailyBalance) : '—',
      context:
        flow.interestLastQuarter > 0
          ? `interest ${formatMoney(flow.interestLastQuarter)} last quarter`
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
  const parts = [formatCount(latest.transactionCount, ['row', 'rows'])];
  if (latest.closingBalance != null) parts.push(`closing ${formatMoney(latest.closingBalance, { decimals: 'auto' })}`);
  const uploaded = formatDate(latest.createdAt.slice(0, 10), 'list');
  if (uploaded) parts.push(`uploaded ${uploaded}`);
  return {
    id: latest.id,
    title: formatDate(latest.periodEnd, 'month'),
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
  const since = input.ingestFromDate ? formatDate(input.ingestFromDate, 'list') : '';
  const alert = input.lastAlert;
  return {
    subtitle: since ? `Since ${since}` : undefined,
    active: !!input.ingestFromDate,
    lastAlert: input.unmatchedCount == null && !alert
      ? '—'
      : alert
      ? `${alert.description} ${formatMoney(Math.abs(alert.amount), { decimals: 'auto' })} · ${
          alert.date === input.today ? 'today' : formatDate(alert.date, 'list')
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
        ? `${formatMoney(emi.amount)} on the ${ordinal(day)}`
        : formatMoney(emi.amount),
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
    ? [formatMoney(credit.amount, { decimals: 'auto' }), formatDate(credit.date, 'list'), credit.description || credit.sourcedDescription]
    : [];
  return {
    available: account.cashBalance !== undefined ? formatMoney(account.cashBalance) : '—',
    lastTransferIn: credit ? parts.filter(Boolean).join(' · ') : undefined,
  };
}

/** The newest transaction date, for the wallet header; null without any. */
export function lastEntryDate(recent: readonly Transaction[] | null | undefined): string | null {
  if (!recent || recent.length === 0) return null;
  return recent.reduce((max, t) => (t.date > max ? t.date : max), recent[0].date);
}
