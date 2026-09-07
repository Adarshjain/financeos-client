'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Transaction } from '@/lib/transaction.types';
import {
  LendingDirection,
  LendingResponse,
  LendingTransactionSummary,
} from '@/lib/types';

import { useCounterpartyMutations } from './useCounterpartyMutations';

type Mutations = ReturnType<typeof useCounterpartyMutations>;
type EditMutations = Pick<Mutations, 'updateLending' | 'linkTransaction' | 'unlinkTransaction'>;

/** Split out of useCounterpartyDetail to keep that hook under the file-length
 *  convention — owns the "Edit Ledger Entry" dialog's form state, including
 *  the linked-transaction picker and the link/unlink diff on save. */
export function useEditLendingEntry(mutations: EditMutations) {
  const [editLendingOpen, setEditLendingOpen] = useState(false);
  const [editingLendingId, setEditingLendingId] = useState<string | null>(null);
  const [lendingDir, setLendingDir] = useState<LendingDirection>('lent');
  const [lendingAmount, setLendingAmount] = useState('');
  const [lendingDate, setLendingDate] = useState('');
  const [lendingExpDate, setLendingExpDate] = useState('');
  const [lendingNotes, setLendingNotes] = useState('');
  const [editOriginalTxId, setEditOriginalTxId] = useState<string | null>(null);
  const [editSelectedTx, setEditSelectedTx] = useState<
    LendingTransactionSummary | Transaction | null
  >(null);

  const handleSelectEditTx = (t: Transaction) => setEditSelectedTx(t);
  const handleClearEditTx = () => setEditSelectedTx(null);

  const handleOpenEditLending = (lending: LendingResponse) => {
    setEditingLendingId(lending.id);
    setLendingDir(lending.direction);
    setLendingAmount(String(lending.amount));
    setLendingDate(lending.entryDate);
    setLendingExpDate(lending.expectedReturnDate ?? '');
    setLendingNotes(lending.notes ?? '');
    setEditOriginalTxId(lending.transaction?.id ?? null);
    setEditSelectedTx(lending.transaction ?? null);
    setEditLendingOpen(true);
  };

  const handleUpdateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLendingId) return;
    try {
      await mutations.updateLending.mutateAsync({
        id: editingLendingId,
        body: {
          direction: lendingDir,
          amount: lendingAmount ? Number(lendingAmount) : undefined,
          entryDate: lendingDate || undefined,
          expectedReturnDate: lendingExpDate || undefined,
          notes: lendingNotes.trim() || undefined,
        },
      });

      // The direction/amount/date/notes PUT and the link PUT/DELETE are two
      // separate server endpoints — only hit the second when the link
      // actually changed.
      const newTxId = editSelectedTx?.id ?? null;
      if (newTxId !== editOriginalTxId) {
        if (newTxId) {
          await mutations.linkTransaction.mutateAsync({
            id: editingLendingId,
            transactionId: newTxId,
          });
        } else {
          await mutations.unlinkTransaction.mutateAsync(editingLendingId);
        }
      }

      toast.success('Entry updated');
      setEditLendingOpen(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  return {
    editLendingOpen,
    setEditLendingOpen,
    lendingDir,
    setLendingDir,
    lendingAmount,
    setLendingAmount,
    lendingDate,
    setLendingDate,
    lendingExpDate,
    setLendingExpDate,
    lendingNotes,
    setLendingNotes,
    editSelectedTx,
    onSelectEditTx: handleSelectEditTx,
    onClearEditTx: handleClearEditTx,
    submittingEditLending: mutations.updateLending.isPending,
    handleOpenEditLending,
    handleUpdateLending,
  };
}
