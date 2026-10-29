'use client';

import React from 'react';

import { ConfirmDialog } from '@/components/ds';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { ApproveDialog } from '@/features/transactions/review/ApproveDialog';
import { ReviewSummaryDialog } from '@/features/transactions/review/ReviewSummaryDialog';
import { useQuickApprove } from '@/features/transactions/review/useQuickApprove';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

import { deleteCopy } from './bulkModel';
import { MergeDialog } from './MergeDialog';
import { useDeleteTransactions } from './useBulkMutations';

export interface BulkTransactionMutationsOptions {
  accounts: Account[] | null;
  /** An action went through for these rows (approved, merged, deleted); the selection and the detail follow. */
  onDone: (done: { kind: 'approve' | 'merge' | 'delete'; ids: string[]; fromBar: boolean }) => void;
}

/**
 * The actions that work on one row or several: Approve (Review button, swipe right, the bar), Delete (swipe
 * left, the bar) and Merge (the bar). Render `dialogs` once on the page; call the functions from the buttons.
 */
export function useBulkTransactionMutations({ accounts, onDone }: BulkTransactionMutationsOptions) {
  const [approving, setApproving] = React.useState<{ transactions: Transaction[]; fromBar: boolean } | null>(null);
  // The rows of the last approve stay while the dialog slides shut, and the dialog stays mounted so a
  // skipped/failed summary (which it owns) outlives the close.
  const [lastApproving, setLastApproving] = React.useState<{ transactions: Transaction[]; fromBar: boolean } | null>(null);
  const [deleting, setDeleting] = React.useState<{ transactions: Transaction[]; fromBar: boolean } | null>(null);
  const [merging, setMerging] = React.useState<readonly [Transaction, Transaction] | null>(null);
  const { quickApprove } = useQuickApprove();
  const del = useDeleteTransactions();

  const openApprove = (next: { transactions: Transaction[]; fromBar: boolean }) => {
    setLastApproving(next);
    setApproving(next);
  };

  /** The one-tap approve: one reason clears at once (Toast with Undo), several open the dialog for that row. */
  const review = async (transaction: Transaction) => {
    const outcome = await quickApprove(transaction);
    if (outcome === 'needs-dialog') openApprove({ transactions: [transaction], fromBar: false });
    if (outcome === 'approved') onDone({ kind: 'approve', ids: [transaction.id], fromBar: false });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (!deleting.fromBar) {
      // One swiped row: it leaves now and the delete finishes behind the closed confirm.
      const { transactions } = deleting;
      setDeleting(null);
      onDone({ kind: 'delete', ids: transactions.map((t) => t.id), fromBar: false });
      await del.remove(transactions, true);
      return;
    }
    const ok = await del.remove(deleting.transactions);
    if (!ok) return;
    const { transactions, fromBar } = deleting;
    setDeleting(null);
    onDone({ kind: 'delete', ids: transactions.map((t) => t.id), fromBar });
  };

  const copy = deleting ? deleteCopy(deleting.transactions) : null;

  const dialogs = (
    <>
      {lastApproving ? (
        <ApproveDialog
          transactions={lastApproving.transactions}
          open={approving !== null}
          onOpenChange={(open) => !open && setApproving(null)}
          instant={!lastApproving.fromBar}
          onDone={() =>
            onDone({ kind: 'approve', ids: lastApproving.transactions.map((t) => t.id), fromBar: lastApproving.fromBar })
          }
        />
      ) : null}
      {merging ? (
        <MergeDialog
          transactions={merging}
          accounts={accounts}
          onClose={() => setMerging(null)}
          onMerged={(deletedId) => onDone({ kind: 'merge', ids: [deletedId], fromBar: true })}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !del.isPending) setDeleting(null);
        }}
        title={copy?.title ?? ''}
        impact={copy?.impact}
        confirmLabel={copy?.confirmLabel ?? 'Delete transaction'}
        confirmLoading={del.isPending}
        onConfirm={() => void confirmDelete()}
      >
        <IrreversibleNote />
      </ConfirmDialog>
      <ReviewSummaryDialog
        summary={del.summary}
        onClose={del.closeSummary}
        title="Delete summary"
        succeededLabel="Deleted"
        hideSkipped
      />
    </>
  );

  return {
    review,
    /** The detail panel's Review button: always the dialog for that row, even with a single reason. */
    reviewInDialog: (transaction: Transaction) => openApprove({ transactions: [transaction], fromBar: false }),
    /** From the selection bar: the selected rows that need review. */
    approve: (transactions: Transaction[]) => openApprove({ transactions, fromBar: true }),
    /** One swiped row (`fromBar` false) or the selection (`fromBar` true). */
    remove: (transactions: Transaction[], fromBar = false) => setDeleting({ transactions, fromBar }),
    merge: (pair: readonly [Transaction, Transaction]) => setMerging(pair),
    dialogs,
  };
}
