'use client';

// The transaction detail opened from "View underlying data" / a row breakdown,
// loaded on demand: UnderlyingTransactionDialog pulls in the transaction detail
// and edit stack (TransactionDetailDialog → TransactionCRUD), which must not
// ride along in the bundle of every page that can show underlying data (the
// dashboard). Nothing is fetched or mounted until a transaction is first
// opened; after that it stays mounted so the dialog animates out on close.

import dynamic from 'next/dynamic';
import { useState } from 'react';

const UnderlyingTransactionDialog = dynamic(
  () => import('./UnderlyingTransactionDialog').then((m) => m.UnderlyingTransactionDialog),
  { ssr: false },
);

interface LazyUnderlyingTransactionDialogProps {
  /** The transaction to show; null keeps the dialog closed (and, until the first one, unloaded). */
  transactionId: string | null;
  onClose: () => void;
}

export function LazyUnderlyingTransactionDialog({ transactionId, onClose }: LazyUnderlyingTransactionDialogProps) {
  const [opened, setOpened] = useState(transactionId !== null);
  if (transactionId !== null && !opened) setOpened(true);
  if (!opened) return null;
  return <UnderlyingTransactionDialog transactionId={transactionId} onClose={onClose} />;
}
