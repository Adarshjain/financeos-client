import type { StatusWordItem } from '@/components/ds/StatusWords/StatusWords';
import { REASON_WORDS } from '@/features/transactions/list/transactionRowsModel';
import { formatDate, formatMoney, pluralize } from '@/lib/format';
import { obligationRefHref } from '@/lib/obligationRefHref';
import { getDerivedRoleLabel } from '@/lib/transaction.helpers';
import type {
  LinkType,
  ObligationRef,
  ReviewType,
  Transaction,
  TransactionLinkResponse,
  TransactionSource,
} from '@/lib/transaction.types';

import { CHANNEL_LABELS } from '../form/constants';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "Monday 12 October 2026" for a calendar day (YYYY-MM-DD); never reads the device zone. */
export function longDate(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return '';
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()];
  return `${weekday} ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

const SOURCE_WORDS: Record<TransactionSource, string> = {
  gmail_transaction_alert: 'Gmail alert',
  gmail_statement: 'Gmail statement',
  manual: 'Manual entry',
  file_upload: 'File upload',
};

export function sourceWords(source: TransactionSource): string {
  return SOURCE_WORDS[source] ?? 'Unknown source';
}

const REVIEW_TYPE_WORDS: Record<Exclude<ReviewType, 'NEEDS_REVIEW'>, string> = {
  AUTO_REVIEWED: 'Auto reviewed',
  MANUALLY_REVIEWED: 'Manually reviewed',
  NA: 'Not applicable',
};

const rupees = (value: number) => formatMoney(Math.abs(value), { decimals: 'exact' });

/** The reasons as words, "Needs review" when it has none. */
function reasonItems(t: Transaction): StatusWordItem[] {
  const reasons = t.reviewReasons ?? [];
  return reasons.length > 0
    ? reasons.map((r) => ({ tone: 'warning' as const, label: REASON_WORDS[r] ?? r }))
    : [{ tone: 'warning' as const, label: 'Needs review' }];
}

/** Under the amount: amber review reasons, Watching with its reason, grey Excluded. */
export function statusItems(t: Transaction): StatusWordItem[] {
  const items: StatusWordItem[] = [];
  if (t.reviewType === 'NEEDS_REVIEW') items.push(...reasonItems(t));
  if (t.isTransactionUnderMonitoring) {
    items.push({ tone: 'warning', label: 'Watching' });
    const reason = t.monitoringReason?.trim();
    if (reason) items.push({ tone: 'neutral', label: `“${reason}”` });
  }
  if (t.isTransactionExcluded) items.push({ tone: 'neutral', label: 'Excluded' });
  return items;
}

/** The Review field: the reasons and "needs review", or the review state's name. */
export function reviewFieldItems(t: Transaction): StatusWordItem[] {
  if (t.reviewType === 'NEEDS_REVIEW') {
    const reasons = (t.reviewReasons ?? []).map((r) => ({ tone: 'warning' as const, label: REASON_WORDS[r] ?? r }));
    return reasons.length > 0
      ? [...reasons, { tone: 'neutral', label: 'needs review' }]
      : [{ tone: 'warning', label: 'Needs review' }];
  }
  return [{ tone: 'neutral', label: REVIEW_TYPE_WORDS[t.reviewType ?? 'NA'] ?? REVIEW_TYPE_WORDS.NA }];
}

/** "Meera · ••7742" (the card), or null when there is none. */
export function cardWords(t: Transaction): string | null {
  if (!(t.cardLabel || t.cardLast4)) return null;
  return [t.cardLabel, t.cardLast4 ? `••${t.cardLast4}` : null].filter(Boolean).join(' · ');
}

/** "Settled 14 Oct · UPI · ₹120 discount": only the reward fields that are set; null when none is. */
export function rewardsWords(t: Transaction): string | null {
  const parts: string[] = [];
  if (t.settlementDate) parts.push(`Settled ${formatDate(t.settlementDate, 'list')}`);
  if (t.channel) parts.push(CHANNEL_LABELS[t.channel] ?? t.channel);
  if (t.instantDiscount != null) parts.push(t.instantDiscount > 0 ? `${rupees(t.instantDiscount)} discount` : 'No discount');
  if (t.convenienceFee != null) parts.push(t.convenienceFee > 0 ? `${rupees(t.convenienceFee)} fee` : 'No fee');
  if (t.isEmi != null) parts.push(t.isEmi ? 'EMI' : 'Not EMI');
  if (t.isInternational != null) parts.push(t.isInternational ? 'International' : 'Domestic');
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** "₹2,95,030 after" (no "bal" prefix), or null when the balance is unknown. */
export function balanceAfterWords(t: Transaction): string | null {
  return t.balance != null ? `${formatMoney(t.balance, { decimals: 'exact' })} after` : null;
}

/** "Bank says ₹144.86 · differs by ₹144.02", or null when the running balance matches the bank's. */
export function bankBalanceWords(t: Transaction): string | null {
  if (t.bankBalance == null) return null;
  const bank = formatMoney(t.bankBalance, { decimals: 'exact' });
  const diff = t.balance != null ? ` · differs by ${rupees(t.bankBalance - t.balance)}` : '';
  return `Bank says ${bank}${diff}`;
}

// ---- Links ----------------------------------------------------------------

export type LinkRow =
  | {
      kind: 'transaction';
      key: string;
      /** The other transaction's name; opens it. */
      title: string;
      otherId: string;
      /** "Refunded purchase · +₹240.00 · 14 Oct · HDFC Regalia Gold". */
      subtitle: string;
      link: TransactionLinkResponse;
    }
  | {
      kind: 'record';
      key: string;
      /** The record's label; opens its page. */
      title: string;
      href: string | null;
      subtitle?: string;
      ref: ObligationRef;
      /** What Unlink does: a lending entry or dividend unlinks at once, a loan settlement asks first; other records are managed from their own page. */
      unlink: 'now' | 'confirm' | null;
    };

/** One row per other transaction in each link, then one per record (lending, loan, dividend) this transaction backs. */
export function linkRows(
  transactionId: string,
  links: readonly TransactionLinkResponse[],
  refs: readonly ObligationRef[],
  accountName: (accountId: string) => string,
): LinkRow[] {
  const rows: LinkRow[] = [];
  for (const link of links) {
    for (const m of link.members) {
      if (m.transactionId === transactionId) continue;
      const role = m.roleLabel || getDerivedRoleLabel(link.type as LinkType, m.isAnchor);
      const signed = formatMoney(m.signedAmount, { decimals: 'exact', sign: 'always' });
      rows.push({
        kind: 'transaction',
        key: `${link.id}:${m.transactionId}`,
        title: m.description || 'Transaction',
        otherId: m.transactionId,
        subtitle: [role, signed, formatDate(m.date, 'list'), accountName(m.accountId)].join(' · '),
        link,
      });
    }
  }
  for (const ref of refs) {
    rows.push({
      kind: 'record',
      key: `${ref.kind}:${ref.id}`,
      title: ref.label,
      href: ref.parentId ? obligationRefHref(ref.kind, ref.parentId) : null,
      subtitle: ref.amount != null ? rupees(ref.amount) : undefined,
      ref,
      unlink:
        ref.kind === 'LENDING' || ref.kind === 'DIVIDEND' || ref.kind === 'EPF_WITHDRAWAL'
          ? 'now'
          : ref.kind === 'LOAN_PAYMENT' && ref.parentId
            ? 'confirm'
            : null,
    });
  }
  return rows;
}

// ---- Delete ---------------------------------------------------------------

/** What deleting says goes and what stays; imported transactions get Legacy's warning. */
export function deleteImpact(t: Transaction): string[] {
  const impact: string[] = ['The transaction is deleted.'];
  const records = t.obligationRefs ?? [];
  if (records.length > 0) {
    const n = records.length;
    impact.push(
      `${n} linked ${pluralize(n, 'record stays', 'records stay')} (${records.map((r) => r.label).join(', ')}) but ${pluralize(n, 'loses', 'lose')} the link.`,
    );
  }
  if (t.source !== 'manual') {
    impact.push('This is not a manually created transaction. It is discouraged to delete this.');
  }
  return impact;
}
