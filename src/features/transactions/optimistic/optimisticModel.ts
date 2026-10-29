import type { TransactionListRow } from '@/features/transactions/list/transactionRowsModel';
import { transactionRow } from '@/features/transactions/list/transactionRowsModel';
import type { Account } from '@/lib/account.types';
import type { ReviewReason, Transaction } from '@/lib/transaction.types';

import type { TransactionFormValues } from '../form/transactionFormModel';
import { NO_CARD, NO_CHANNEL, signedAmount, valuesFromTransaction } from '../form/transactionFormModel';
import type { TransactionsQuery } from '../list/transactionsUrl';

/** The row goes away (deleted). */
export const REMOVED = 'removed' as const;

/** One change shown before the server has answered: the rows it touches and what it does to each. */
export interface OptimisticChange {
  ids: readonly string[];
  change: (t: Transaction) => Transaction | typeof REMOVED;
}

/** Approve: the ticked reasons come off; with none left the row is manually reviewed. */
export function approveChange(ids: readonly string[], reasons: readonly ReviewReason[]): OptimisticChange {
  return {
    ids,
    change: (t) => {
      const left = (t.reviewReasons ?? []).filter((r) => !reasons.includes(r));
      return { ...t, reviewReasons: left, reviewType: left.length > 0 ? t.reviewType : 'MANUALLY_REVIEWED' };
    },
  };
}

export function removeChange(ids: readonly string[]): OptimisticChange {
  return { ids, change: () => REMOVED };
}

export function patchChange(id: string, patch: Partial<Transaction>): OptimisticChange {
  return { ids: [id], change: (t) => ({ ...t, ...patch }) };
}

function fullPatch(values: TransactionFormValues, categories: Transaction['categories'], original: Transaction, supportsCards: boolean) {
  return {
    amount: signedAmount(values),
    date: values.date === original.date.slice(0, 10) ? original.date : values.date,
    accountId: values.accountId,
    cardId: supportsCards && values.cardId !== NO_CARD ? values.cardId : null,
    description: values.description,
    mcc: values.mcc.trim() || undefined,
    categories,
    reviewType: values.reviewType,
    reviewReasons: values.reviewType === 'NEEDS_REVIEW' ? values.reviewReasons : [],
    isTransactionExcluded: values.excluded,
    isTransactionUnderMonitoring: values.monitored,
    monitoringReason: values.monitored ? values.monitoringReason : undefined,
    settlementDate: values.settlementDate || null,
    channel: values.channel === NO_CHANNEL ? null : values.channel,
    isEmi: values.emi,
    isInternational: values.international,
  } satisfies Partial<Transaction>;
}

/**
 * What the Edit form changed, as the stored shape: only the fields that differ from what the form opened
 * on, so an earlier edit that fails takes only its own fields with it (card words and balance wait for the server).
 */
export function patchFromValues(
  values: TransactionFormValues,
  categories: Transaction['categories'],
  original: Transaction,
  supportsCards: boolean,
): Partial<Transaction> {
  const next = fullPatch(values, categories, original, supportsCards);
  const was = { ...fullPatch(valuesFromTransaction(original), original.categories ?? [], original, supportsCards), cardId: original.cardId ?? null };
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(next) as (keyof typeof next)[]) {
    const same = k === 'categories'
      ? (next.categories ?? []).map((c) => c.id).join() === (was.categories ?? []).map((c) => c.id).join()
      : JSON.stringify(next[k]) === JSON.stringify(was[k]);
    if (!same) out[k] = next[k];
  }
  return out as Partial<Transaction>;
}

/**
 * The form to send: what the person changed, on top of the transaction as the server holds it now (an
 * approve or edit that went through since the form opened is kept, not overwritten by the form's old snapshot).
 */
export function mergeOntoLatest(
  values: TransactionFormValues,
  opened: Transaction,
  latest: Transaction,
): TransactionFormValues {
  const was = valuesFromTransaction(opened);
  const now = valuesFromTransaction(latest);
  const out: Record<string, unknown> = { ...now };
  for (const k of Object.keys(values) as (keyof TransactionFormValues)[]) {
    if (JSON.stringify(values[k]) !== JSON.stringify(was[k])) out[k] = values[k];
  }
  return out as unknown as TransactionFormValues;
}

export interface OptimisticView {
  /** The page's transactions with every change applied; a removed one stays so an open detail can finish reading it. */
  transactions: Transaction[];
  rows: TransactionListRow[];
  /** How many rows left the list, for the pager's total. */
  gone: number;
  /** What to add to the server's Needs review count. */
  needsReviewDelta: number;
}

export interface ViewContext {
  accounts: readonly Account[] | null;
  query: Pick<TransactionsQuery, 'review' | 'reason' | 'accounts'>;
}

const needsReview = (t: Transaction) => t.reviewType === 'NEEDS_REVIEW';

/** Applies the changes, oldest first, to the page the server sent. The page's own references come back when there are none. */
export function applyChanges(
  server: readonly Transaction[],
  rows: readonly TransactionListRow[],
  changes: readonly OptimisticChange[],
  ctx: ViewContext,
): OptimisticView | null {
  if (changes.length === 0) return null;
  const now = new Map<string, Transaction | typeof REMOVED>(server.map((t) => [t.id, t]));
  for (const { ids, change } of changes) {
    for (const id of ids) {
      const current = now.get(id);
      if (current !== undefined && current !== REMOVED) now.set(id, change(current));
    }
  }
  const transactions = server.map((t) => {
    const v = now.get(t.id);
    return v === REMOVED || v === undefined ? t : v;
  });
  // A row that matched the review, reason or account filter and no longer does leaves, as it will once the page
  // is read again. The other filters (text, period, amount, category, source) stay as the server drew them
  // until then: an edit to those is rare and their matching is the server's to say.
  const matches = (t: Transaction) =>
    (!ctx.query.review || t.reviewType === ctx.query.review) &&
    (!ctx.query.reason || (t.reviewReasons ?? []).includes(ctx.query.reason)) &&
    (ctx.query.accounts.length === 0 || ctx.query.accounts.includes(t.accountId));
  const hidden = (t: Transaction, v: Transaction | typeof REMOVED | undefined) =>
    v === REMOVED || (v !== undefined && matches(t) && !matches(v));
  const showSource = ctx.query.review === 'NEEDS_REVIEW';
  const byId = new Map(server.map((t) => [t.id, t]));
  let gone = 0;
  const next: TransactionListRow[] = [];
  for (const row of rows) {
    const t = byId.get(row.id);
    const v = now.get(row.id);
    if (!t) {
      next.push(row);
    } else if (hidden(t, v)) {
      gone += 1;
    } else if (v !== undefined && v !== REMOVED && v !== t) {
      next.push(transactionRow(v, { accounts: ctx.accounts, showSource }));
    } else {
      next.push(row);
    }
  }
  let needsReviewDelta = 0;
  for (const t of server) {
    const v = now.get(t.id);
    const before = needsReview(t);
    const after = v !== undefined && v !== REMOVED && needsReview(v);
    needsReviewDelta += Number(after) - Number(before);
  }
  return { transactions, rows: next, gone, needsReviewDelta };
}

/** One transaction after the given changes (a removed one is undefined). */
export function applyTo(t: Transaction, changes: readonly OptimisticChange[]): Transaction | undefined {
  let now: Transaction | typeof REMOVED = t;
  for (const { ids, change } of changes) {
    if (now !== REMOVED && ids.includes(t.id)) now = change(now);
  }
  return now === REMOVED ? undefined : now;
}
