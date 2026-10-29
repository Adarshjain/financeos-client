import { currentMilestones } from '@/features/accounts/detail/milestonesModel';
import { deriveBillCardState } from '@/features/bills/billCardStateModel';
import {
  type Cardholder,
  type CreditCard,
  isCardholderClosed,
} from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { formatCount, formatDate, formatMoney, formatPercent, initialsOf } from '@/lib/format';
import type { RewardReport } from '@/lib/rewards.types';
import type { CardCycleSummary } from '@/lib/statement.types';
import type { Transaction } from '@/lib/transaction.types';
import { utilisationTone } from '@/lib/utilisation';

import { paidTiming } from '../billsHistoryModel';
import { daysBetween } from './overviewDatesModel';

export type MeterTone = 'brand' | 'warning' | 'danger';
export type TextTone = 'ink-3' | 'warning' | 'danger';

/** Limit utilisation colour: brand under 30%, amber from 30%, rose from 70% (owner 38). */
export function meterTone(pct: number | null | undefined): MeterTone {
  const t = utilisationTone(pct);
  return t === 'high' ? 'danger' : t === 'medium' ? 'warning' : 'brand';
}

function textTone(pct: number | null | undefined): TextTone {
  const t = utilisationTone(pct);
  return t === 'high' ? 'danger' : t === 'medium' ? 'warning' : 'ink-3';
}

// ---- Limit & cycle ---------------------------------------------------------

export interface LimitCycleModel {
  subtitle: string | null;
  anchored: boolean;
  used: {
    value: string;
    /** Null without a limit: no bar, no caption. */
    pct: number | null;
    tone: MeterTone;
    caption: string | null;
  };
  cycle: { value: string; caption: string };
  bill: { value: string; caption: string };
  /** Null for a card on a shared pool: the pool row replaces it. */
  ownLimit: string | null;
  pool: { label: string; value: string; sub: string } | null;
}

function dueCaption(bill: CardBillResponse): string {
  const parts: string[] = [];
  if (bill.paymentDueDate) parts.push(`Due ${formatDate(bill.paymentDueDate, 'list')}`);
  const days = bill.daysUntilDue;
  if (days != null) {
    parts.push(
      days < 0
        ? `${formatCount(-days, ['day', 'days'])} overdue`
        : days === 0
          ? 'today'
          : `${formatCount(days, ['day', 'days'])} left`
    );
  }
  return parts.join(' · ');
}

export function buildLimitCycle(
  account: CreditCard,
  summary: CardCycleSummary | null | undefined,
  bill: CardBillResponse | null | undefined,
  today: string
): LimitCycleModel {
  const owedAmount = Math.max(0, -(account.balance ?? 0));
  const pool = account.limitPool ?? null;
  const limit = account.creditLimit ?? account.effectiveCreditLimit ?? summary?.creditLimit ?? null;
  const hasLimit = limit != null && limit > 0;
  const pct = hasLimit ? (owedAmount / limit) * 100 : null;
  const free =
    hasLimit && account.creditLimit == null && pool
      ? pool.available
      : hasLimit
        ? Math.max(0, limit - owedAmount)
        : null;

  const subtitleParts: string[] = [];
  if (summary?.periodEnd) subtitleParts.push(`Statement of ${formatDate(summary.periodEnd, 'list')}`);
  if (bill?.nextStatementExpectedOn) {
    subtitleParts.push(`next statement ${formatDate(bill.nextStatementExpectedOn, 'list')}`);
  }

  const state = bill ? deriveBillCardState(bill, today) : null;
  const unbilled = state?.unbilled != null ? Math.max(0, state.unbilled) : 0;
  const lastStatement = summary?.periodEnd ?? bill?.periodEnd ?? null;

  let billValue = formatMoney(0);
  let billCaption = 'No bill due';
  if (bill && state && state.phase !== 'awaiting') {
    billValue = state.toPay != null ? formatMoney(state.toPay) : '—';
    billCaption = dueCaption(bill) || 'Due date missing';
  } else if (bill?.status === 'PAID' && bill.paidMarkedOn) {
    const timing = paidTiming(bill.paidMarkedOn, bill.paymentDueDate);
    billCaption = `Paid ${formatDate(bill.paidMarkedOn, 'list')}${timing ? ` · ${timing}` : ''}`;
  }

  return {
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : null,
    anchored: Boolean(account.balanceAnchored),
    used: {
      value: formatMoney(owedAmount),
      pct,
      tone: meterTone(pct),
      caption:
        hasLimit && pct != null && free != null
          ? `${formatPercent(pct)} of ${formatMoney(limit, { compact: true })} · ${formatMoney(free, { compact: true })} free`
          : null,
    },
    cycle: {
      value: formatMoney(unbilled),
      caption: lastStatement ? `Unbilled since ${formatDate(lastStatement, 'list')}` : 'Unbilled',
    },
    bill: { value: billValue, caption: billCaption },
    ownLimit: pool ? null : account.creditLimit != null ? formatMoney(account.creditLimit) : 'Not set',
    pool: pool
      ? {
          label: `Shared limit · ${pool.name}`,
          value: `${formatMoney(pool.available)} free of ${formatMoney(pool.creditLimit)}`,
          sub: `across ${formatCount(pool.memberCount, ['card', 'cards'])}`,
        }
      : null,
  };
}

// ---- Rewards ---------------------------------------------------------------

export interface RewardsModel {
  subtitle: string;
  earned: string;
  rules: Array<{ id: string; label: string; value: string }>;
  milestones: Array<{
    id: string;
    label: string;
    pct: number;
    caption: string;
  }>;
}

function pts(n: number): string {
  return formatCount(n, 'pts');
}

/** Null when the report has neither rules nor milestones: the Rewards tab carries the empty state. */
export function buildRewards(
  report: RewardReport | null | undefined,
  window: { from: string; to: string; calendarYear: boolean } | null | undefined,
  today: string
): RewardsModel | null {
  if (!report || (report.rules.length === 0 && report.milestones.length === 0) || !window) return null;
  const { summary } = report;
  const totalPts = summary.points + summary.milestonesPts;
  const earnedParts: string[] = [];
  if (totalPts > 0) {
    earnedParts.push(
      summary.pointsValueInr != null
        ? `${pts(totalPts)} ≈ ${formatMoney(summary.pointsValueInr)}`
        : pts(totalPts)
    );
  }
  if (summary.cashbackInr > 0) earnedParts.push(`${formatMoney(summary.cashbackInr)} cashback`);

  return {
    subtitle: window.calendarYear
      ? 'Calendar year'
      : `Anniversary year ${formatDate(window.from, 'list')} → ${formatDate(window.to, 'list')}`,
    earned: earnedParts.length > 0 ? earnedParts.join(' · ') : pts(0),
    rules: report.rules.map((rule) => {
      const rupees = rule.earnedUnit === 'RUPEES';
      const fmt = (n: number) => (rupees ? formatMoney(n) : pts(n));
      const cap = rule.capStatus;
      return {
        id: rule.ruleId,
        label: rule.name,
        value:
          cap && cap.cap > 0
            ? `${rupees ? formatMoney(cap.used ?? 0) : formatCount(cap.used ?? 0)} of ${rupees ? formatMoney(cap.cap) : pts(cap.cap)} cap`
            : fmt(rule.earned),
      };
    }),
    milestones: currentMilestones(report.milestones, today).map((m) => {
      const spend = m.basis === 'SPEND';
      const pct = m.threshold > 0 ? Math.min(100, Math.round((m.progress / m.threshold) * 100)) : 0;
      const payout =
        m.payoutValue != null
          ? m.rewardType === 'POINTS'
            ? pts(m.payoutValue)
            : formatMoney(m.payoutValue)
          : null;
      const daysLeft = daysBetween(today, m.windowEnd);
      const count = spend
        ? `${formatMoney(m.progress)} of ${formatMoney(m.threshold)}`
        : `${m.progress} of ${formatCount(m.threshold, ['transaction', 'transactions'])}`;
      const each = !spend && m.minTxnAmount ? ` (${formatMoney(m.minTxnAmount)}+ each)` : '';
      const target = `${count}${each}${payout ? ` → ${payout}` : ''}${m.achieved ? ' · achieved' : ''}`;
      return {
        id: m.milestoneId,
        label: m.name,
        pct,
        caption:
          daysLeft != null && daysLeft >= 0
            ? `${target} · ${formatCount(daysLeft, ['day', 'days'])} left`
            : target,
      };
    }),
  };
}

// ---- Cardholders -----------------------------------------------------------

export interface CardholderStats {
  cardholderId: string;
  currentCycleSpend: number;
  spendThisYear: number;
  transactionCount: number;
  lastUsedOn?: string | null;
}

export interface CardholderRowModel {
  id: string;
  name: string;
  initials: string;
  role: 'Primary' | 'Add-on';
  caption: string;
  limitLine: { text: string; tone: TextTone } | null;
}

export interface CardholdersModel {
  subtitle: string;
  rows: CardholderRowModel[];
}

export function buildCardholders(
  cardholders: readonly Cardholder[],
  stats: readonly CardholderStats[] | null | undefined,
  today: string
): CardholdersModel {
  const open = cardholders
    .filter((c) => !isCardholderClosed(c, today))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'PRIMARY' ? -1 : 1));
  const plastics = open.reduce(
    (n, c) => n + (c.cards ?? []).filter((card) => !card.closedOn).length,
    0
  );
  const byId = new Map((stats ?? []).map((s) => [s.cardholderId, s]));

  return {
    subtitle: `${formatCount(plastics, ['active plastic', 'active plastics'])}`,
    rows: open.map((c) => {
      const role = c.role === 'PRIMARY' ? 'Primary' : 'Add-on';
      const name = c.personName || role;
      const last4 = c.currentLast4 ?? c.cards?.find((card) => !card.closedOn)?.last4;
      const s = byId.get(c.id);
      const parts: string[] = [];
      if (last4) parts.push(`••${last4}`);
      if (s) {
        parts.push(`${formatMoney(s.spendThisYear)} this year`);
        parts.push(formatCount(s.transactionCount, ['transaction', 'transactions']));
        if (s.lastUsedOn) parts.push(`last used ${formatDate(s.lastUsedOn, 'list')}`);
      }
      let limitLine: CardholderRowModel['limitLine'] = null;
      if (c.role === 'ADDON' && c.spendLimit != null && c.spendLimit > 0 && s) {
        const pct = (s.currentCycleSpend / c.spendLimit) * 100;
        limitLine = {
          text: `${formatPercent(pct)} of ${formatMoney(c.spendLimit)} spend limit used`,
          tone: textTone(pct),
        };
      }
      return {
        id: c.id,
        name,
        initials: initialsOf(name) || '•',
        role,
        caption: parts.join(' · '),
        limitLine,
      };
    }),
  };
}

// ---- Connections -----------------------------------------------------------

export interface ConnectionsModel {
  statements: string;
  gmail: string;
}

export function buildConnections(input: {
  lastStatementDate: string | null | undefined;
  ingestFromDate: string | null | undefined;
  identifierCount: number | null;
  lastMatchDate: string | null | undefined;
  unmatchedCount: number | null | undefined;
}): ConnectionsModel {
  const parts: string[] = [];
  if (input.identifierCount != null) {
    parts.push(formatCount(input.identifierCount, ['identifier', 'identifiers']));
  }
  if (input.lastMatchDate) parts.push(`last match ${formatDate(input.lastMatchDate, 'list')}`);
  if (input.unmatchedCount != null && input.unmatchedCount > 0) {
    parts.push(`${input.unmatchedCount} unmatched`);
  }
  return {
    statements: input.lastStatementDate
      ? `PDF upload · last ${formatDate(input.lastStatementDate, 'list')}`
      : 'None yet',
    gmail: !input.ingestFromDate ? 'Off' : parts.length > 0 ? parts.join(' · ') : 'On',
  };
}

// ---- Recent transactions ---------------------------------------------------

export interface TransactionRowModel {
  id: string;
  date: string;
  description: string;
  category: string | null;
  amount: string;
  credit: boolean;
  /** The balance with its ₹ (negatives read −₹). */
  balanceLabel: string | null;
}

/** "+45.00" for a credit, "7,430.00" for a debit; the balance in whole rupees or null. */
export function buildRecentTransactions(items: readonly Transaction[]): TransactionRowModel[] {
  return items.map((t) => {
    const credit = t.amount > 0;
    const amount = formatMoney(Math.abs(t.amount), { decimals: 'exact', symbol: false });
    return {
      id: t.id,
      date: formatDate(t.date, 'list'),
      description: t.description || t.sourcedDescription || '—',
      category: t.categories?.[0]?.name ?? null,
      amount: credit ? `+${amount}` : amount,
      credit,
      balanceLabel: t.balance != null ? formatMoney(t.balance) : null,
    };
  });
}
