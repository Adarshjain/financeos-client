import { deriveBillCardState } from '@/features/bills/billCardState';
import {
  type Account,
  type BankAccount,
  type Broker,
  type CreditCard,
  type GenericAccount,
  isAccountClosed,
  isAccountClosing,
} from '@/lib/account.types';
import { sumBalances } from '@/lib/accountTotals';
import type { CardBillResponse } from '@/lib/api/types';
import { sumCreditUsage } from '@/lib/creditLimitPools';
import { AccountType } from '@/lib/types';
import { utilisationTone } from '@/lib/utilisation';

export interface RewardTotal {
  accountId: string;
  points: number;
  grossValueInr?: number | null;
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';
export interface BadgeModel {
  tone: BadgeTone;
  label: string;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function dateParts(iso: string): { y: string; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { y: match[1], m: Number(match[2]), d: Number(match[3]) };
}

/** "13 Oct" from a calendar date (YYYY-MM-DD). */
export function formatDayMonth(iso: string): string {
  const p = dateParts(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]}` : '';
}

/** "today" or "yesterday" when the calendar date is that day relative to `today` (both YYYY-MM-DD), else null. */
export function relativeDay(iso: string, today: string): 'today' | 'yesterday' | null {
  const day = iso.slice(0, 10);
  if (day === today.slice(0, 10)) return 'today';
  const t = dateParts(today);
  if (!t) return null;
  const before = new Date(Date.UTC(Number(t.y), t.m - 1, t.d - 1));
  const yesterday = `${before.getUTCFullYear()}-${String(before.getUTCMonth() + 1).padStart(2, '0')}-${String(before.getUTCDate()).padStart(2, '0')}`;
  return day === yesterday ? 'yesterday' : null;
}

/** "today", "yesterday", else "13 Oct", from a calendar date (YYYY-MM-DD). */
export function formatDayMonthRelative(iso: string, today: string): string {
  return relativeDay(iso, today) ?? formatDayMonth(iso);
}

/** "13 Oct 2026" from a calendar date (YYYY-MM-DD). */
export function formatDayMonthYear(iso: string): string {
  const p = dateParts(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '';
}

/** Indian grouping with the given decimals, no currency symbol: "2,95,030.50". */
export function formatAmount(value: number, decimals = 2): string {
  return (value + 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** "₹8,66,024": whole rupees, Indian grouping. */
export function formatRupees(value: number): string {
  return `₹${formatAmount(value, 0)}`;
}

/** Compact rupees: "₹2.99L", "₹3L", "₹1.2Cr"; under a lakh the full figure. */
export function formatCompactRupees(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${Number((abs / 1e7).toFixed(2))}Cr`;
  if (abs >= 1e5) return `${sign}₹${Number((abs / 1e5).toFixed(2))}L`;
  return `${sign}${formatRupees(abs)}`;
}

/** One decimal, none when it is zero: "0%", "34.3%". */
export function formatPct(pct: number): string {
  return `${Number(pct.toFixed(1))}%`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function ofType<T extends Account>(
  accounts: readonly Account[],
  type: AccountType
): T[] {
  return accounts.filter((a) => a.type === type) as T[];
}

export interface AccountSections {
  banks: { open: BankAccount[]; closed: BankAccount[] };
  cards: { open: CreditCard[]; closed: CreditCard[] };
  brokers: { open: Broker[]; closed: Broker[] };
  wallets: { open: GenericAccount[]; closed: GenericAccount[] };
}

function split<T extends Account>(
  list: T[],
  today: string
): { open: T[]; closed: T[] } {
  return {
    open: list.filter((a) => !isAccountClosed(a, today)),
    closed: list.filter((a) => isAccountClosed(a, today)),
  };
}

/** Accounts grouped by type, each split into open (closing ones included) and closed. */
export function groupAccounts(
  accounts: readonly Account[],
  today: string
): AccountSections {
  return {
    banks: split(
      ofType<BankAccount>(accounts, AccountType.BANK_ACCOUNT),
      today
    ),
    cards: split(ofType<CreditCard>(accounts, AccountType.CREDIT_CARD), today),
    brokers: split(ofType<Broker>(accounts, AccountType.BROKER), today),
    wallets: split(
      ofType<GenericAccount>(accounts, AccountType.GENERIC),
      today
    ),
  };
}

/** Wallets that count towards cash: open and not a liability (excluded-from-net ones included). */
export function cashWallets(sections: AccountSections): GenericAccount[] {
  return sections.wallets.open.filter(
    (w) => w.financialPosition !== 'liability'
  );
}

export interface KpiModel {
  label: string;
  value: string;
  context?: string;
}

export function cashKpi(sections: AccountSections): KpiModel {
  const wallets = cashWallets(sections);
  const total = sumBalances(sections.banks.open) + sumBalances(wallets);
  return {
    label: 'Cash & wallets',
    value: formatRupees(total),
    context: `${plural(sections.banks.open.length, 'bank', 'banks')} · ${plural(wallets.length, 'wallet', 'wallets')}`,
  };
}

export function cardsKpi(sections: AccountSections): KpiModel {
  const usage = sumCreditUsage(sections.cards.open);
  return {
    label: 'Cards · you owe',
    value: formatRupees(usage.owed),
    context:
      usage.limit > 0 && usage.utilizationPct != null
        ? `${formatPct(usage.utilizationPct)} of ${formatCompactRupees(usage.limit)} limit`
        : undefined,
  };
}

export function investmentsKpi(
  sections: AccountSections,
  dayChangePct: number | null | undefined
) {
  const kpi: KpiModel & {
    delta?: {
      value: string;
      period: string;
      direction: 'good' | 'bad' | 'neutral';
    };
  } = {
    label: 'Investments',
    value: formatRupees(sumBalances(sections.brokers.open)),
  };
  if (dayChangePct != null && Number.isFinite(dayChangePct)) {
    kpi.delta = {
      value: `${dayChangePct > 0 ? '+' : ''}${dayChangePct.toFixed(2)}%`,
      period: 'today',
      direction:
        dayChangePct > 0 ? 'good' : dayChangePct < 0 ? 'bad' : 'neutral',
    };
  }
  return kpi;
}

export function netWorthKpi(netWorth: number): KpiModel {
  return { label: 'Net worth', value: formatRupees(netWorth) };
}

/** The one line under a section listing its closed accounts; null when there are none. */
export function closedLine(
  closed: readonly {
    name: string;
    last4?: string | null;
    closedOn?: string | null;
  }[]
): string | null {
  if (closed.length === 0) return null;
  if (closed.length > 1) return `Closed · ${closed.length}`;
  const [a] = closed;
  const last4 = a.last4 ? ` ••${a.last4}` : '';
  const when = a.closedOn ? `, closed ${formatDayMonthYear(a.closedOn)}` : '';
  return `Closed · 1 · ${a.name}${last4}${when}`;
}

export function closedLineFor(accounts: readonly Account[]): string | null {
  return closedLine(
    accounts.map((a) => ({
      name: a.name,
      last4: 'last4' in a ? (a.last4 ?? null) : null,
      closedOn: a.closedOn,
    }))
  );
}

// ---- Bank accounts ---------------------------------------------------------

export interface BankRow {
  id: string;
  name: string;
  last4: string | null;
  bank: string | null;
  synced: boolean;
  gapLabel: string | null;
  balance: string;
  asOf: string | null;
  phoneSub: string | null;
  closed: boolean;
  /** The account itself, for the Edit dialog opened from the row. */
  account: BankAccount;
}

/** Badge text for the gap between transactions and statement; null when none. */
export function gapLabel(gap: number | null | undefined): string | null {
  if (gap == null || !Number.isFinite(gap) || gap === 0) return null;
  return `Gap ${formatCompactRupees(Math.abs(gap))}`;
}

/** The date a balance is current to: the later of the last transaction (ignored when in the future) and the last statement. */
export function balanceCurrency(
  lastTransactionDate: string | null | undefined,
  lastStatementDate: string | null | undefined,
  today: string
): { kind: 'statement' | 'transaction'; date: string } | null {
  const tx = lastTransactionDate && lastTransactionDate <= today ? lastTransactionDate : null;
  if (tx && (!lastStatementDate || tx > lastStatementDate)) return { kind: 'transaction', date: tx };
  return lastStatementDate ? { kind: 'statement', date: lastStatementDate } : null;
}

export function bankRow(account: BankAccount, today: string): BankRow {
  const current = balanceCurrency(account.lastTransactionDate, account.lastStatementDate, today);
  const day = current ? formatDayMonthRelative(current.date, today) : '';
  const cap = day.charAt(0).toUpperCase() + day.slice(1);
  const isTx = current?.kind === 'transaction';
  return {
    id: account.id,
    name: account.name,
    last4: account.last4 || null,
    bank: account.bank || null,
    synced: Boolean(account.ingestFromDate),
    gapLabel: gapLabel(account.reconciliationGap),
    balance: formatAmount(sumBalances([account])),
    asOf: current ? (isTx ? cap : `Stmt ${day}`) : null,
    phoneSub: current ? (isTx ? `As of ${day}` : `Statement ${day}`) : null,
    closed: isAccountClosed(account, today),
    account,
  };
}

// ---- Credit cards ----------------------------------------------------------

export type UsedTone = 'brand' | 'warning' | 'danger';
export type UsedTextTone = 'ink' | 'warning' | 'danger';

export interface LimitUsed {
  pct: number;
  pctLabel: string;
  limitLabel: string;
  tone: UsedTone;
  textTone: UsedTextTone;
}

/** Utilisation shown against a card's limit, coloured by the shared thresholds; null with no limit. */
export function limitUsed(card: CreditCard): LimitUsed | null {
  const limit = card.effectiveCreditLimit ?? card.creditLimit ?? 0;
  if (!(limit > 0)) return null;
  const pct =
    card.utilizationPct ?? (Math.max(0, -(card.balance ?? 0)) / limit) * 100;
  const band = utilisationTone(pct);
  return {
    pct,
    pctLabel: formatPct(pct),
    limitLabel: formatCompactRupees(limit),
    tone: band === 'high' ? 'danger' : band === 'medium' ? 'warning' : 'brand',
    textTone:
      band === 'high' ? 'danger' : band === 'medium' ? 'warning' : 'ink',
  };
}

/** Rewards cell text: points, else the rupee value, else an em dash. */
export function rewardsText(total: RewardTotal | undefined): string {
  if (total && total.points > 0)
    return `${total.points.toLocaleString('en-IN')} pts`;
  if (total && (total.grossValueInr ?? 0) > 0)
    return `₹${formatAmount(total.grossValueInr as number, 0)}`;
  return '—';
}

/** The next-bill badge from a card's bill; null when there is nothing to show. */
export function nextBillBadge(
  bill: CardBillResponse | undefined,
  today: string
): BadgeModel | null {
  if (!bill) return null;
  const state = deriveBillCardState(bill, today);
  if (state.phase === 'overdue') return { tone: 'danger', label: 'Overdue' };
  if (state.phase === 'arrived') {
    const days = bill.daysUntilDue;
    if (days != null && days <= 3) {
      return {
        tone: 'warning',
        label: days <= 0 ? 'Due today' : `Due in ${days} d`,
      };
    }
    return bill.paymentDueDate
      ? { tone: 'neutral', label: formatDayMonth(bill.paymentDueDate) }
      : null;
  }
  if (state.statementLate)
    return { tone: 'danger', label: 'Statement missing' };
  return bill.nextStatementExpectedOn
    ? { tone: 'neutral', label: formatDayMonth(bill.nextStatementExpectedOn) }
    : null;
}

export interface CardRow {
  id: string;
  name: string;
  last4: string | null;
  bank: string | null;
  sharedLimit: string | null;
  badges: BadgeModel[];
  closing: string | null;
  statementMissing: boolean;
  outstanding: string;
  limitUsed: LimitUsed | null;
  rewards: string;
  cardholders: number;
  closed: boolean;
}

/** The card row fields that do not depend on bills or rewards, so they can render before those load. */
export type CardBaseRow = Omit<
  CardRow,
  'badges' | 'statementMissing' | 'rewards'
> & {
  /** Badges that come from the account itself, shown after the next-bill badge. */
  extraBadges: BadgeModel[];
};

export function cardBaseRow(card: CreditCard, today: string): CardBaseRow {
  const extraBadges: BadgeModel[] = [];
  if (!card.last4) extraBadges.push({ tone: 'warning', label: 'No active card' });
  return {
    id: card.id,
    name: card.name,
    last4: card.last4 || null,
    bank: card.bank || null,
    sharedLimit: card.limitPool
      ? `Shared limit · ${card.limitPool.name} ${formatCompactRupees(card.limitPool.creditLimit)}`
      : null,
    extraBadges,
    closing:
      isAccountClosing(card, today) && card.closedOn
        ? `Closing ${formatDayMonth(card.closedOn)}`
        : null,
    outstanding: formatAmount(-(card.balance ?? 0)),
    limitUsed: limitUsed(card),
    cardholders: card.cardholders?.length ?? 0,
    closed: isAccountClosed(card, today),
  };
}

export function cardRow(
  card: CreditCard,
  bill: CardBillResponse | undefined,
  reward: RewardTotal | undefined,
  today: string
): CardRow {
  const next = nextBillBadge(bill, today);
  const { extraBadges, ...base } = cardBaseRow(card, today);
  return {
    ...base,
    badges: next ? [next, ...extraBadges] : extraBadges,
    statementMissing: next?.label === 'Statement missing',
    rewards: rewardsText(reward),
  };
}

export function cardsSubtitle(open: readonly CreditCard[]): string {
  const limit = sumCreditUsage(open).limit;
  const base = 'Outstanding is what you owe today';
  return limit > 0
    ? `${base} · ${formatRupees(limit)} limit across ${plural(open.length, 'card', 'cards')}`
    : base;
}

// ---- Brokers and wallets ---------------------------------------------------

export interface BrokerRow {
  id: string;
  name: string;
  value: string;
  cash: string;
  phoneSub: string;
  closed: boolean;
}

export function brokerRow(broker: Broker, today: string): BrokerRow {
  const cash = formatRupees(broker.cashBalance ?? 0);
  return {
    id: broker.id,
    name: broker.name,
    value: formatAmount(sumBalances([broker])),
    cash: formatAmount(broker.cashBalance ?? 0),
    phoneSub: broker.clientId
      ? `${broker.clientId} · cash ${cash}`
      : `cash ${cash}`,
    closed: isAccountClosed(broker, today),
  };
}

export interface WalletRow {
  id: string;
  name: string;
  excluded: boolean;
  liability: boolean;
  balance: string;
  closed: boolean;
}

export function walletRow(wallet: GenericAccount, today: string): WalletRow {
  return {
    id: wallet.id,
    name: wallet.name,
    excluded: Boolean(wallet.excludeFromNetAsset),
    liability: wallet.financialPosition === 'liability',
    balance: formatAmount(sumBalances([wallet])),
    closed: isAccountClosed(wallet, today),
  };
}
