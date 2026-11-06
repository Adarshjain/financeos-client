import { categoryLabel, findCategory, findSub } from '@/lib/categoryList';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import { rowAmount } from '@/lib/transactionAmount';
import type { UncategorizedGroup, UncategorizedTransaction } from '@/lib/uncategorized.types';

/** Groups and their transactions are read this many at a time. */
export const SORT_PAGE_SIZE = 10;
/** Applying a group reads every one of its transactions, this many at a time (the server's largest page). */
export const SORT_FETCH_ALL_SIZE = 200;

/** One group's choice, applied at once: the category, whether to save a rule, and the transactions left out. */
export interface GroupChoice {
  pick: CategoryPick;
  rule: boolean;
  /** The text the rule matches (Contains). */
  pattern: string;
  /** Ids the user unticked: they stay uncategorized. */
  unticked: string[];
}

/** A shortcut chip for a person group: its words and the category it sets. */
export interface ReasonChip {
  label: string;
  pick: CategoryPick;
}

const OUT_REASONS: { label: string; categoryKey: string; subcategoryKey?: string }[] = [
  { label: 'Lent', categoryKey: 'lent' },
  { label: 'Gifts', categoryKey: 'gifts' },
  { label: 'Family', categoryKey: 'family' },
  { label: 'Bills · House help', categoryKey: 'bills', subcategoryKey: 'bills.house_help' },
  { label: 'Bills · Rent', categoryKey: 'bills', subcategoryKey: 'bills.rent' },
  { label: 'Repaid', categoryKey: 'repaid' },
];

const IN_REASONS: { label: string; categoryKey: string; subcategoryKey?: string }[] = [
  { label: 'Borrowed', categoryKey: 'borrowed' },
  { label: 'Repaid', categoryKey: 'repaid' },
  { label: 'Gifts', categoryKey: 'gifts' },
  { label: 'Earnings', categoryKey: 'earnings' },
];

/** The likely reasons for money to or from a person, as picks of the real list (a reason the list does not have is left out). */
export function reasonChips(list: readonly CategoryDef[], direction: string): ReasonChip[] {
  const defs = direction === 'IN' ? IN_REASONS : OUT_REASONS;
  return defs
    .filter((d) => {
      const category = findCategory(list, d.categoryKey);
      return category && (!d.subcategoryKey || findSub(category, d.subcategoryKey));
    })
    .map((d) => ({ label: d.label, pick: { categoryKey: d.categoryKey, subcategoryKey: d.subcategoryKey ?? null } }));
}

export const samePick = (a: CategoryPick | null, b: CategoryPick | null) =>
  a?.categoryKey === b?.categoryKey && (a?.subcategoryKey ?? null) === (b?.subcategoryKey ?? null);

/** "Food · Delivery" for a pick, with the category's icon; null when it is not in the list. */
export function pickWords(list: readonly CategoryDef[], pick: CategoryPick | null) {
  const category = findCategory(list, pick?.categoryKey);
  if (!category) return null;
  return { icon: category.icon, label: categoryLabel(category.name, findSub(category, pick?.subcategoryKey)?.name) };
}

const money = (n: number) => formatMoney(n, { decimals: 'auto' });

/** The line under a group's name: "Person · 6 payments · ₹18,000", "4 transactions · ₹2,140", or "28 Oct · ₹740" for a one-off. */
export function groupLine(g: Pick<UncategorizedGroup, 'person' | 'oneOff' | 'count' | 'total' | 'lastDate'>): string {
  if (g.oneOff) return `${formatDate(g.lastDate, 'list')} · ${money(Math.abs(g.total))}`;
  const total = money(Math.abs(g.total));
  return g.person
    ? `Person · ${formatCount(g.count, ['payment', 'payments'])} · ${total}`
    : `${formatCount(g.count, ['transaction', 'transactions'])} · ${total}`;
}

/** The text a "Do the same next time" rule matches: the group's name as the descriptions show it. */
export function rulePattern(g: Pick<UncategorizedGroup, 'label'>): string {
  return g.label.toUpperCase();
}

const CHANNEL_WORDS: Record<string, string> = {
  UPI: 'UPI',
  POS: 'POS',
  ATM: 'ATM',
  ONLINE: 'Online',
  CONTACTLESS: 'Contactless',
};

/** One transaction of a group as a row of "Applies to": date, account (with its card), amount. */
export function groupRow(t: UncategorizedTransaction) {
  const channel = t.channel ? CHANNEL_WORDS[t.channel] : undefined;
  const name = t.cardLabel && t.cardLabel !== 'You' ? t.cardLabel : t.accountName;
  const last4 = t.cardLast4 ?? t.accountLast4;
  const shown = rowAmount(t);
  const credit = shown?.credit ?? false;
  const amount = shown?.text ?? '—';
  return {
    id: t.id,
    description: t.description || t.sourcedDescription || '—',
    date: formatDate(t.date, 'list'),
    account: channel && !last4 ? `${name} · ${channel}` : name,
    plastic: last4 ? `••${last4}` : undefined,
    amount: credit ? `+${amount}` : amount,
    isCredit: credit,
  };
}

/** How many of a group's transactions are ticked, given the ids left unticked. */
export function tickedCount(group: Pick<UncategorizedGroup, 'count'>, unticked: readonly string[]): number {
  return Math.max(0, group.count - unticked.length);
}

/** The toast after a group is set: how many transactions were set, and how many the server left alone. */
export function savedWords(updated: number, skipped: number): string {
  const set = `Set the category of ${formatCount(updated, ['transaction', 'transactions'])}`;
  return skipped > 0 ? `${set} · ${formatCount(skipped)} left as they were` : set;
}

/** The toast after Undo: how many transactions went back to uncategorized. */
export function undoneWords(restored: number, skipped: number): string {
  const back = `Put ${formatCount(restored, ['transaction', 'transactions'])} back`;
  return skipped > 0 ? `${back} · ${formatCount(skipped)} changed since and stayed` : back;
}
