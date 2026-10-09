'use client';

// Opens a transaction listed in the underlying data (or a breakdown section)
// in the regular transaction detail dialog. The row only carries the id, so the
// transaction is read by id; accounts come from the shared accounts query.
// The detail dialog opens at once with a placeholder (skeleton, or the error)
// and fills in place when the transaction arrives — one dialog, one opening
// animation. It stays mounted after closing, still showing the last
// transaction, so the sheet animates out instead of vanishing.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { TransactionDetailDialog } from '@/components/transactions/TransactionDetailDialog';
import { DialogBody, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

interface UnderlyingTransactionDialogProps {
  /** The transaction to show; null keeps the dialog closed. */
  transactionId: string | null;
  onClose: () => void;
}

export function UnderlyingTransactionDialog({ transactionId, onClose }: UnderlyingTransactionDialogProps) {
  const qc = useQueryClient();
  const accounts = useAccounts();
  // The last transaction opened: its content stays up while the dialog closes.
  const [shownId, setShownId] = useState<string | null>(transactionId);
  if (transactionId !== null && transactionId !== shownId) setShownId(transactionId);

  const query = useQuery({
    queryKey: keys.transactions.byId(shownId ?? ''),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/transactions/{id}', {
        params: { path: { id: shownId! } },
      });
      return data as unknown as Transaction;
    },
    // Only while open: a deleted transaction is not re-read after closing.
    enabled: transactionId !== null,
  });

  if (shownId === null) return null;

  const transaction = query.data && accounts.data ? query.data : null;
  const error = query.error ?? accounts.error;

  return (
    <TransactionDetailDialog
      open={transactionId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      transaction={transaction}
      accounts={accounts.data ?? []}
      // An edit or delete changes the KPI and its rows, wherever they are shown.
      onMutate={() => {
        qc.invalidateQueries({ queryKey: keys.transactions.all });
        qc.invalidateQueries({ queryKey: keys.reports.all });
        qc.invalidateQueries({ queryKey: keys.dashboards.all });
      }}
      placeholder={
        <>
          <DialogHeader>
            <DialogTitle>Transaction</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            {error ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {getErrorMessage(error, 'Failed to load the transaction')}
              </p>
            ) : (
              <>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </>
            )}
          </DialogBody>
        </>
      }
    />
  );
}
