import type { Transaction, TransactionSource } from '@/lib/transaction.types';

/** How far a source is trusted when two copies of one transaction are merged: statement > upload > Gmail alert > manual. */
export function getSourcePriorityScore(source: TransactionSource): number {
  switch (source) {
    case 'gmail_statement':
      return 4;
    case 'file_upload':
      return 3;
    case 'gmail_transaction_alert':
      return 2;
    case 'manual':
      return 1;
    default:
      return 0;
  }
}

/** The one to keep by default: the more trusted source; on a tie the older one (by created time). */
export function computeDefaultKeepId(tx1: Transaction, tx2: Transaction): string {
  const score1 = getSourcePriorityScore(tx1.source);
  const score2 = getSourcePriorityScore(tx2.source);
  if (score1 > score2) return tx1.id;
  if (score2 > score1) return tx2.id;

  const time1 = new Date(tx1.createdAt || tx1.date).getTime();
  const time2 = new Date(tx2.createdAt || tx2.date).getTime();
  return time1 <= time2 ? tx1.id : tx2.id;
}

export interface MergeChecks {
  differentAccount: boolean;
  /** Amounts are signed, so opposite signs are opposite directions: usually a payment and its reversal. */
  directionMismatch: boolean;
  amountMismatch: boolean;
}

export function mergeChecks(tx1: Transaction, tx2: Transaction): MergeChecks {
  return {
    differentAccount: tx1.accountId !== tx2.accountId,
    directionMismatch: Math.sign(tx1.amount) !== Math.sign(tx2.amount),
    amountMismatch: Math.abs(tx1.amount - tx2.amount) > 0.001,
  };
}

export interface MergeWarning {
  kind: 'blocked' | 'direction' | 'amount';
  title: string;
  text: string;
}

/** The one warning to show, most serious first (a different account blocks the merge). */
export function mergeWarning(
  checks: MergeChecks,
  accountNames: [string, string],
): MergeWarning | null {
  if (checks.differentAccount) {
    return {
      kind: 'blocked',
      title: 'Cross-account merge blocked',
      text: `These transactions belong to different accounts (${accountNames[0]} vs ${accountNames[1]}). Cross-account merging is not allowed.`,
    };
  }
  if (checks.directionMismatch) {
    return {
      kind: 'direction',
      title: 'Direction mismatch',
      text: 'One transaction is a debit and the other a credit. These are usually a payment and its reversal, not duplicates — consider linking them instead of merging.',
    };
  }
  if (checks.amountMismatch) {
    return {
      kind: 'amount',
      title: 'Amount mismatch',
      text: 'Amounts differ between these transactions. Confirm they represent the same real-world event before merging.',
    };
  }
  return null;
}

const SOURCE_LABELS: Record<TransactionSource, string> = {
  gmail_statement: 'Statement',
  file_upload: 'Upload',
  gmail_transaction_alert: 'Gmail alert',
  manual: 'Manual',
};

/** The board's words for where a transaction came from. */
export function mergeSourceLabel(source: TransactionSource): string {
  return SOURCE_LABELS[source] ?? source;
}
