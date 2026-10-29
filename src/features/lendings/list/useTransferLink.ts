'use client';

import React from 'react';

import { showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { useLinkLendingTransaction, useUnlinkLendingTransaction } from '../useLendingMutations';
import type { TransferRow } from './lendingsListModel';

/**
 * Linking suggested bank transfers to ledger entries, shared by the Lendings tab and a person's Matching card.
 * Linking keeps the row in place as "already linked" (until the next refresh) and toasts with Undo, which unlinks
 * it and restores the row. `onChanged` runs after a link or an undo, so a page can refresh what it shows.
 */
export function useTransferLink(rows: TransferRow[], onChanged?: () => void) {
  const onError = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });
  const link = useLinkLendingTransaction({ onError: onError("Couldn't link transaction. Try again.") });
  const unlink = useUnlinkLendingTransaction({ onError: onError("Couldn't unlink transaction. Try again.") });
  const [linkingKey, setLinkingKey] = React.useState<string | null>(null);
  const [linked, setLinked] = React.useState<ReadonlySet<string>>(new Set());
  const mark = (key: string, on: boolean) =>
    setLinked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  // Rows that share an entry or a transaction with a linked row are hidden, so none can re-link it.
  const hidden = (row: TransferRow) =>
    !linked.has(row.key) &&
    rows.some((other) => linked.has(other.key) && (other.lendingId === row.lendingId || other.transactionId === row.transactionId));

  const undo = async (row: TransferRow) => {
    try {
      await unlink.mutateAsync(row.lendingId);
      mark(row.key, false);
      onChanged?.();
    } catch {
      // onError already surfaced the toast.
    }
  };

  /** Links one row; returns whether it worked. `quiet` skips the toast (Confirm all says it once). */
  const onLink = async (row: TransferRow, quiet = false): Promise<boolean> => {
    setLinkingKey(row.key);
    try {
      await link.mutateAsync({ id: row.lendingId, transactionId: row.transactionId });
      mark(row.key, true);
      onChanged?.();
      if (!quiet) showToast(`Linked to ${row.personName}`, { action: { label: 'Undo', onSelect: () => void undo(row) } });
      return true;
    } catch {
      return false;
    } finally {
      setLinkingKey(null);
    }
  };

  return { linkingKey, linked, hidden, onLink };
}
