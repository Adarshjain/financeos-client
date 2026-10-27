import { receiptVariance } from '@/features/investments/dividends/dividendsModel';
import type { Dividend } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { ReceiptStatusBadge } from './ReceiptStatusBadge';

export { receiptVariance };

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
