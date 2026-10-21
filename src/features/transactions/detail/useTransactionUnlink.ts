'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { showToast } from '@/components/ds';
import { useLinkLendingTransaction, useUnlinkLendingTransaction } from '@/features/lendings/useLendingTransactionLink';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateInvestmentQueries, invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { ObligationRef, TransactionLinkResponse } from '@/lib/transaction.types';

import {
  createTransactionLink,
  deleteLoanPayment,
  deleteTransactionLink,
  linkDividendTransaction,
  unlinkDividendTransaction,
} from './transactionDetailApi';

/**
 * Unlink from the detail. A transaction link, a lending entry or a dividend unlinks at once and the toast offers
 * Undo, which links it again; a loan settlement is deleted (the caller confirms first), so it has no Undo.
 * Every change refreshes the lists and the page behind the panel.
 */
export function useTransactionUnlink(transactionId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const fail = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });
  const linkLending = useLinkLendingTransaction({ onError: fail('Failed to link transaction') });
  const unlinkLending = useUnlinkLendingTransaction({ onError: fail('Failed to unlink transaction') });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.transactions.all }),
      invalidateMoneyQueries(queryClient),
    ]);
    router.refresh();
  };

  /** Runs one change under the row's busy mark; true when it worked. The mutation hooks already toast their own failures. */
  const run = async (key: string, change: () => Promise<unknown>, failure?: string): Promise<boolean> => {
    setBusyKey(key);
    try {
      await change();
      await refresh();
      return true;
    } catch (e) {
      if (failure) fail(failure)(e);
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const undoWith = (key: string, change: () => Promise<unknown>, restored: string, failure?: string) => () => {
    void run(key, change, failure).then((ok) => {
      if (ok) showToast(restored);
    });
  };

  const unlinkTransaction = async (link: TransactionLinkResponse) => {
    const restore = () =>
      createTransactionLink({
        type: link.type,
        note: link.note,
        members: link.members.map((m) => ({ transactionId: m.transactionId, isAnchor: m.isAnchor })),
      });
    const ok = await run(link.id, () => deleteTransactionLink(link.id), 'Failed to unlink transaction');
    if (ok) {
      showToast('Link removed', {
        action: { label: 'Undo', onSelect: undoWith(link.id, restore, 'Link restored', 'Failed to restore the link') },
      });
    }
  };

  const unlinkRecord = async (ref: ObligationRef) => {
    const key = `${ref.kind}:${ref.id}`;
    if (ref.kind === 'LENDING') {
      const ok = await run(key, () => unlinkLending.mutateAsync(ref.id));
      if (ok) {
        showToast('Unlinked from ledger entry', {
          action: {
            label: 'Undo',
            onSelect: undoWith(
              key,
              () => linkLending.mutateAsync({ id: ref.id, transactionId }),
              'Linked to ledger entry',
            ),
          },
        });
      }
    } else if (ref.kind === 'DIVIDEND') {
      const ok = await run(key, () => unlinkDividendTransaction(ref.id), 'Failed to unlink dividend');
      if (ok) {
        invalidateInvestmentQueries(queryClient);
        showToast('Unlinked from dividend', {
          action: {
            label: 'Undo',
            onSelect: undoWith(
              key,
              () => linkDividendTransaction(ref.id, transactionId),
              'Linked to dividend',
              'Failed to restore the link',
            ),
          },
        });
      }
    }
  };

  /** Deletes the loan payment behind this transaction; the installment is unpaid again. */
  const removeSettlement = async (ref: ObligationRef): Promise<boolean> => {
    if (!ref.parentId) return false;
    const loanId = ref.parentId;
    const ok = await run(
      `${ref.kind}:${ref.id}`,
      async () => {
        await deleteLoanPayment(loanId, ref.id);
        await queryClient.invalidateQueries({ queryKey: keys.loans.all });
      },
      'Failed to remove settlement',
    );
    if (ok) showToast('Settlement removed');
    return ok;
  };

  return { busyKey, unlinkTransaction, unlinkRecord, removeSettlement };
}
