import { RELATIONSHIP_LABELS } from '@/features/accounts/cards/constants';
import {
  formatDayMonth,
  formatDayMonthYear,
  formatPct,
  formatRupees,
} from '@/features/accounts/list/accountsList';
import {
  type Card,
  type Cardholder,
  type CreditCard,
  isCardholderClosed,
} from '@/lib/account.types';
import { utilisationTone } from '@/lib/utilisation';

import { initialsOf } from '../overview/cardOverviewModel';
import { plural } from '../overview/dates';

export interface CardStat {
  cardId: string;
  firstUsedOn?: string | null;
  lastUsedOn?: string | null;
  transactionCount: number;
}

/** One entry of `GET /accounts/{id}/cardholders/stats`. */
export interface HolderStats {
  cardholderId: string;
  currentCycleSpend: number;
  spendThisYear: number;
  transactionCount: number;
  lastUsedOn?: string | null;
  cards?: CardStat[];
}

export type HolderMenuId = 'edit' | 'reassign' | 'addCard' | 'close' | 'reopen' | 'delete';

export interface HolderMenuItem {
  id: HolderMenuId;
  label: string;
  destructive?: boolean;
  separatorBefore?: boolean;
}

export type LimitTone = 'ink' | 'warning' | 'danger';

export interface StatModel {
  label: string;
  value: string;
  tone?: LimitTone;
  muted?: boolean;
}

export type PlasticStatus = 'Active' | 'Replaced' | 'Closed';

export interface PlasticModel {
  id: string;
  last4: string;
  /** "••7741". */
  mask: string;
  status: PlasticStatus;
  caption: string;
  /** A replaced or closed card of a holder that has more than one card. */
  deletable: boolean;
}

export interface HolderCardModel {
  id: string;
  name: string;
  initials: string;
  roleLabel: string;
  primary: boolean;
  caption: string;
  stats: StatModel[];
  /** Columns of the stat grid on desktop: 3 for a bank, 4 for a credit card. */
  statColumns: 3 | 4;
  plasticsLabel: string;
  plastics: PlasticModel[];
  /** Credit-card add-ons carry the "close this cardholder" footer. */
  closeFooter: boolean;
  menu: HolderMenuItem[];
}

export interface ClosedHolderModel {
  id: string;
  name: string;
  initials: string;
  caption: string;
  menu: HolderMenuItem[];
}

export interface SharedLimitModel {
  thisCard: string;
  shared: string;
}

export interface CardsModel {
  isBank: boolean;
  intro: string | null;
  open: HolderCardModel[];
  closed: ClosedHolderModel[];
  sharedLimit: SharedLimitModel | null;
}

/** "15 Mar 24". */
export function formatShortDate(iso: string): string {
  const day = formatDayMonth(iso);
  return day ? `${day} ${iso.slice(2, 4)}` : '';
}

export function roleLabel(role: Cardholder['role'], isBank: boolean): string {
  if (role === 'PRIMARY') return 'Primary';
  return isBank ? 'Joint holder' : 'Add-on';
}

export function holderName(holder: Cardholder, isBank: boolean): string {
  return holder.personName || roleLabel(holder.role, isBank);
}

function relationshipLabel(holder: Cardholder): string | null {
  if (holder.role === 'PRIMARY' || !holder.relationship) return null;
  return RELATIONSHIP_LABELS[holder.relationship] ?? null;
}

/** The colour of a "limit used" percent: ink under 30%, amber from 30%, rose from 70% (owner 38). */
export function limitUsedTone(pct: number | null | undefined): LimitTone {
  const t = utilisationTone(pct);
  return t === 'high' ? 'danger' : t === 'medium' ? 'warning' : 'ink';
}

export function activePlastic(holder: Cardholder): Card | undefined {
  return (holder.cards ?? []).find((c) => !c.closedOn);
}

/** A closed plastic is "Replaced" when the holder has a plastic issued on or after the day it closed. */
export function plasticStatus(card: Card, all: readonly Card[]): PlasticStatus {
  if (!card.closedOn) return 'Active';
  const closedOn = card.closedOn;
  const replaced = all.some((c) => c.id !== card.id && c.issuedOn && c.issuedOn >= closedOn);
  return replaced ? 'Replaced' : 'Closed';
}

export function plasticModel(
  card: Card,
  all: readonly Card[],
  stats: HolderStats | undefined
): PlasticModel {
  const status = plasticStatus(card, all);
  let caption: string;
  if (status === 'Active') {
    caption = card.issuedOn ? `issued ${formatShortDate(card.issuedOn)}` : '';
  } else {
    const range = [card.issuedOn, card.closedOn]
      .filter((d): d is string => Boolean(d))
      .map(formatShortDate)
      .join(' → ');
    const count = stats?.cards?.find((s) => s.cardId === card.id)?.transactionCount;
    const parts = [range];
    if (count != null) parts.push(plural(count, 'transaction', 'transactions'));
    caption = parts.filter(Boolean).join(' · ');
  }
  return {
    id: card.id,
    last4: card.last4,
    mask: `••${card.last4}`,
    status,
    caption,
    deletable: status !== 'Active' && all.length > 1,
  };
}

/**
 * The ⋯ menu of one holder (owner 28): close, reopen and delete are for add-ons and joint holders only;
 * Add a card only while the holder has no active card; delete only when no transaction is left on the holder.
 * The primary holder and a closed holder never offer Add a card or Close.
 */
export function holderMenu(holder: Cardholder, today: string): HolderMenuItem[] {
  const closed = isCardholderClosed(holder, today);
  const addon = holder.role === 'ADDON';
  const items: HolderMenuItem[] = [];
  if (closed && addon) items.push({ id: 'reopen', label: 'Reopen cardholder' });
  items.push({ id: 'edit', label: 'Edit details' });
  items.push({ id: 'reassign', label: 'Reassign transactions' });
  if (!closed && !activePlastic(holder)) items.push({ id: 'addCard', label: 'Add a card' });
  if (!closed && addon) items.push({ id: 'close', label: 'Close cardholder' });
  if (addon && !holder.transactionCount) {
    items.push({ id: 'delete', label: 'Delete cardholder', destructive: true, separatorBefore: true });
  }
  return items;
}

function openCaption(holder: Cardholder, isBank: boolean): string {
  const parts: string[] = [];
  if (holder.role === 'PRIMARY') {
    parts.push('Account holder');
    if (holder.openedOn) parts.push(`opened ${formatDayMonthYear(holder.openedOn)}`);
  } else {
    const rel = relationshipLabel(holder);
    if (rel) parts.push(rel);
    else parts.push(roleLabel(holder.role, isBank));
    if (holder.openedOn) parts.push(`added ${formatDayMonthYear(holder.openedOn)}`);
    if (holder.spendLimit != null && holder.spendLimit > 0) {
      parts.push(`spend limit ${formatRupees(holder.spendLimit)}`);
    }
  }
  return parts.join(' · ');
}

export function holderStats(
  holder: Cardholder,
  stats: HolderStats | undefined,
  isBank: boolean
): StatModel[] {
  if (!stats) return [];
  const out: StatModel[] = [
    { label: 'Spend · year', value: formatRupees(stats.spendThisYear) },
    { label: isBank ? 'Transactions' : 'Txns', value: String(stats.transactionCount) },
    { label: 'Last used', value: stats.lastUsedOn ? formatDayMonth(stats.lastUsedOn) : '—' },
  ];
  if (!isBank) {
    const limit = holder.spendLimit;
    if (holder.role === 'ADDON' && limit != null && limit > 0) {
      const pct = (stats.currentCycleSpend / limit) * 100;
      out.push({ label: 'Limit used', value: formatPct(pct), tone: limitUsedTone(pct) });
    } else {
      out.push({ label: 'Limit used', value: '—', muted: true });
    }
  }
  return out;
}

function closedCaption(holder: Cardholder, stats: HolderStats | undefined, isBank: boolean): string {
  const parts: string[] = [roleLabel(holder.role, isBank)];
  const rel = relationshipLabel(holder);
  if (rel) parts.push(rel.toLowerCase());
  const closedOn = holder.effectiveClosedOn ?? holder.closedOn;
  if (closedOn) parts.push(`closed ${formatDayMonthYear(closedOn)}`);
  const count = holder.transactionCount ?? stats?.transactionCount ?? 0;
  parts.push(`${plural(count, 'transaction', 'transactions')} kept`);
  return parts.join(' · ');
}

/** The "Shared limit" card of a credit card: its own limit and the pool it draws on. */
export function sharedLimitModel(account: CreditCard): SharedLimitModel {
  const pool = account.limitPool ?? null;
  return {
    thisCard:
      account.creditLimit != null ? `Own limit · ${formatRupees(account.creditLimit)}` : 'Not set',
    shared: pool
      ? `${pool.name} · ${formatRupees(pool.creditLimit)} · ${plural(pool.memberCount, 'card', 'cards')}`
      : 'None',
  };
}

export const BANK_INTRO =
  'Debit cards on this account. Card spends and ATM withdrawals are attributed to the holder whose card was used.';

export function buildCardsModel(input: {
  cardholders: readonly Cardholder[];
  stats: readonly HolderStats[] | null | undefined;
  isBank: boolean;
  creditCard: CreditCard | null;
  today: string;
}): CardsModel {
  const { cardholders, stats, isBank, creditCard, today } = input;
  const byId = new Map((stats ?? []).map((s) => [s.cardholderId, s]));
  const open: HolderCardModel[] = [];
  const closed: ClosedHolderModel[] = [];
  const ordered = [...cardholders].sort((a, b) =>
    a.role === b.role ? 0 : a.role === 'PRIMARY' ? -1 : 1
  );

  for (const holder of ordered) {
    const s = byId.get(holder.id);
    const name = holderName(holder, isBank);
    const initials = initialsOf(name) || '•';
    if (isCardholderClosed(holder, today)) {
      closed.push({
        id: holder.id,
        name,
        initials,
        caption: closedCaption(holder, s, isBank),
        menu: holderMenu(holder, today),
      });
      continue;
    }
    const cards = holder.cards ?? [];
    const sorted = [...cards].sort((a, b) => Number(Boolean(a.closedOn)) - Number(Boolean(b.closedOn)));
    open.push({
      id: holder.id,
      name,
      initials,
      roleLabel: roleLabel(holder.role, isBank),
      primary: holder.role === 'PRIMARY',
      caption: openCaption(holder, isBank),
      stats: holderStats(holder, s, isBank),
      statColumns: isBank ? 3 : 4,
      plasticsLabel: isBank ? 'Cards' : 'Plastics',
      plastics: sorted.map((c) => plasticModel(c, cards, s)),
      closeFooter: !isBank && holder.role === 'ADDON',
      menu: holderMenu(holder, today),
    });
  }

  return {
    isBank,
    intro: isBank ? BANK_INTRO : null,
    open,
    closed,
    sharedLimit: creditCard ? sharedLimitModel(creditCard) : null,
  };
}
