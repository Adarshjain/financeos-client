import { deriveBillCardState } from '@/features/bills/billCardStateModel';
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
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';
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

function dateParts(iso: string): { y: string; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { y: match[1], m: Number(match[2]), d: Number(match[3]) };
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
    value: formatMoney(total),
    context: `${formatCount(sections.banks.open.length, ['bank', 'banks'])} · ${formatCount(wallets.length, ['wallet', 'wallets'])}`,
  };
}

export function cardsKpi(sections: AccountSections): KpiModel {
  const usage = sumCreditUsage(sections.cards.open);
  return {
    label: 'Cards · you owe',
    value: formatMoney(usage.owed),
    context:
      usage.limit > 0 && usage.utilizationPct != null
        ? `${formatPercent(usage.utilizationPct)} of ${formatMoney(usage.limit, { compact: true })} limit`
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
    value: formatMoney(sumBalances(sections.brokers.open)),
  };
  if (dayChangePct != null && Number.isFinite(dayChangePct)) {
    kpi.delta = {
      value: formatPercent(dayChangePct, { sign: 'always', decimals: 2, fixed: true }),
      period: 'today',
      direction:
        dayChangePct > 0 ? 'good' : dayChangePct < 0 ? 'bad' : 'neutral',
    };
  }
  return kpi;
}

export function netWorthKpi(netWorth: number): KpiModel {
  return { label: 'Net worth', value: formatMoney(netWorth) };
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
  const when = a.closedOn ? `, closed ${formatDate(a.closedOn, 'full')}` : '';
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
  return `Gap ${formatMoney(Math.abs(gap), { compact: true })}`;
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
  const day = current ? formatDate(current.date, 'relative', { today, inline: true }) : '';
  const cap = day.charAt(0).toUpperCase() + day.slice(1);
  const isTx = current?.kind === 'transaction';
  return {
    id: account.id,
    name: account.name,
    last4: account.last4 || null,
    bank: account.bank || null,
    synced: Boolean(account.ingestFromDate),
    gapLabel: gapLabel(account.reconciliationGap),
    balance: formatMoney(sumBalances([account]), { decimals: 'exact', symbol: false }),
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
    pctLabel: formatPercent(pct),
    limitLabel: formatMoney(limit, { compact: true }),
    tone: band === 'high' ? 'danger' : band === 'medium' ? 'warning' : 'brand',
    textTone:
      band === 'high' ? 'danger' : band === 'medium' ? 'warning' : 'ink',
  };
}

/** Rewards cell text: points, else the rupee value, else an em dash. */
export function rewardsText(total: RewardTotal | undefined): string {
  if (total && total.points > 0)
    return formatCount(total.points, 'pts');
  if (total && (total.grossValueInr ?? 0) > 0)
    return formatMoney(total.grossValueInr as number);
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
      ? { tone: 'neutral', label: formatDate(bill.paymentDueDate, 'list') }
      : null;
  }
  if (state.statementLate)
    return { tone: 'danger', label: 'Statement missing' };
  return bill.nextStatementExpectedOn
    ? { tone: 'neutral', label: formatDate(bill.nextStatementExpectedOn, 'list') }
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
      ? `Shared limit · ${card.limitPool.name} ${formatMoney(card.limitPool.creditLimit, { compact: true })}`
      : null,
    extraBadges,
    closing:
      isAccountClosing(card, today) && card.closedOn
        ? `Closing ${formatDate(card.closedOn, 'list')}`
        : null,
    outstanding: formatMoney(-(card.balance ?? 0), { decimals: 'exact', symbol: false }),
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
    ? `${base} · ${formatMoney(limit)} limit across ${formatCount(open.length, ['card', 'cards'])}`
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
  const cash = formatMoney(broker.cashBalance ?? 0);
  return {
    id: broker.id,
    name: broker.name,
    value: formatMoney(sumBalances([broker]), { decimals: 'exact', symbol: false }),
    cash: formatMoney(broker.cashBalance ?? 0, { decimals: 'exact', symbol: false }),
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
    balance: formatMoney(sumBalances([wallet]), { decimals: 'exact', symbol: false }),
    closed: isAccountClosed(wallet, today),
  };
}
