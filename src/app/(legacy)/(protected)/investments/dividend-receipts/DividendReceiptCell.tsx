import type { Dividend } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { ReceiptStatusBadge } from './ReceiptStatusBadge';

/** Variance (in ₹) between the expected net and the linked credit that is
 *  still treated as "matches" — rounding noise. */
const VARIANCE_TOLERANCE = 1;

/** Signed gap between the linked credit and the expected net, or null when
 *  the dividend isn't linked / the gap is within tolerance. */
export function receiptVariance(dividend: Dividend): number | null {
  if (!dividend.transaction) return null;
  const expectedNet = Number(dividend.amount || 0) - Number(dividend.tds || 0);
  const diff = dividend.transaction.signedAmount - expectedNet;
  return Math.abs(diff) > VARIANCE_TOLERANCE ? diff : null;
}

/** Receipt badge plus the linked-credit line and variance hint. */
export function DividendReceiptCell({ dividend }: { dividend: Dividend }) {
  const txn = dividend.transaction;
  const variance = receiptVariance(dividend);
  return (
    <div className="space-y-0.5">
      <ReceiptStatusBadge status={dividend.receiptStatus} />
      {txn && (
        <p className="text-2xs text-slate-500 dark:text-slate-400">
          +{formatMoney(txn.signedAmount)} · {txn.accountName || 'Account'} · {formatDate(txn.date)}
        </p>
      )}
      {variance !== null && (
        <p className="text-2xs text-amber-600 dark:text-amber-400">
          ±{formatMoney(Math.abs(variance))} vs expected
        </p>
      )}
    </div>
  );
}
