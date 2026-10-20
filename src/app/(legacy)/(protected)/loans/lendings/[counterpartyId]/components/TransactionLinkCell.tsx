'use client';

import { Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/utils';

import type { LendingEntryWithBalance, SplitTotal } from './CounterpartyLedgerTable';

interface TransactionLinkCellProps {
  entry: LendingEntryWithBalance;
  splitTotal?: SplitTotal;
  onLink: () => void;
}

/** Renders either the linked-transaction summary (with a split-bill hint when
 *  other loaded entries share the same transaction) or a "Link" affordance —
 *  shared by both the mobile card and desktop table row. */
export function TransactionLinkCell({ entry, splitTotal, onLink }: TransactionLinkCellProps) {
  const tx = entry.transaction;

  if (!tx) {
    return (
      <Button variant="ghost" size="micro" onClick={onLink}>
        Link
      </Button>
    );
  }

  const tooltip = `${tx.signedAmount >= 0 ? '+' : '-'}${formatMoney(Math.abs(tx.signedAmount))}`;
  const showSplit = (splitTotal?.count ?? 0) >= 2;

  return (
    <div className="flex flex-col min-w-0" title={tooltip}>
      <span className="inline-flex items-center gap-1 text-2xs text-slate-600 dark:text-slate-300 truncate">
        <Link2 className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
        <span className="truncate">
          {tx.accountName || 'Account'} · {formatDate(tx.date)}
        </span>
      </span>
      {showSplit && splitTotal && (
        <span className="text-2xs text-slate-400">
          split: {formatMoney(splitTotal.sum)} of {formatMoney(Math.abs(tx.signedAmount))}
        </span>
      )}
    </div>
  );
}
