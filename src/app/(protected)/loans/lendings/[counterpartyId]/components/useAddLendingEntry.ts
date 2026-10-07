'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  directionOf,
  fromEntryType,
  type LendingEntryType,
  settleUpEntry,
} from '@/lib/lendingEntry';
import { Transaction } from '@/lib/transaction.types';

import { useCounterpartyMutations } from './useCounterpartyMutations';

type CreateLendingMutation = ReturnType<typeof useCounterpartyMutations>['createLending'];

/** Split out of useCounterpartyDetail to keep that hook under the file-length
 *  convention — owns the "Add Ledger Entry" dialog's form state, including the
 *  linked-transaction picker (selection + amount/date prefill + reset). */
export function useAddLendingEntry(
  counterpartyId: string,
  createLending: CreateLendingMutation,
) {
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addEntryType, setAddEntryType] = useState<LendingEntryType>('lent');
  const [addAmount, setAddAmount] = useState('');
  const [addEntryDate, setAddEntryDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [addExpDate, setAddExpDate] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addSelectedTx, setAddSelectedTx] = useState<Transaction | null>(null);

  // Fresh dialog each time it opens or closes; clears any leftover pick from
  // a cancelled or just-submitted add (both the trigger button and the
  // dialog's own close/cancel/outside-click route through this setter).
  const handleSetAddEntryOpen = (open: boolean) => {
    setAddEntryOpen(open);
    setAddSelectedTx(null);
  };

  const handleSetAddEntryType = (next: LendingEntryType) => {
    // The picker's type filter (DEBIT/CREDIT) is direction-derived, so a
    // previously-selected transaction may no longer be valid once the money
    // flows the other way. Switching principal <-> settlement keeps it.
    if (directionOf(next) !== directionOf(addEntryType)) setAddSelectedTx(null);
    setAddEntryType(next);
  };

  /** "Settle up": open the dialog pre-filled with the one repayment that zeroes the balance. */
  const openSettleUp = (netPosition: number) => {
    const settle = settleUpEntry(netPosition);
    if (!settle) return;
    setAddSelectedTx(null);
    setAddEntryType(settle.entryType);
    setAddAmount(String(settle.amount));
    setAddEntryOpen(true);
  };

  const handleSelectAddTx = (t: Transaction) => {
    setAddSelectedTx(t);
    if (!addAmount) setAddAmount(String(Math.abs(t.amount)));
    if (!addEntryDate) setAddEntryDate(t.date);
  };

  const handleClearAddTx = () => setAddSelectedTx(null);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    try {
      await createLending.mutateAsync({
        counterpartyId,
        ...fromEntryType(addEntryType),
        amount: Number(addAmount),
        entryDate: addEntryDate,
        expectedReturnDate: addExpDate || undefined,
        transactionId: addSelectedTx?.id,
        notes: addNotes.trim() || undefined,
      });
      toast.success('Entry added');
      handleSetAddEntryOpen(false);
      setAddAmount('');
      setAddNotes('');
      setAddExpDate('');
      setAddEntryType('lent');
    } catch {
      // onError already surfaced the toast.
    }
  };

  return {
    addEntryOpen,
    setAddEntryOpen: handleSetAddEntryOpen,
    addEntryType,
    setAddEntryType: handleSetAddEntryType,
    openSettleUp,
    addAmount,
    setAddAmount,
    addEntryDate,
    setAddEntryDate,
    addExpDate,
    setAddExpDate,
    addNotes,
    setAddNotes,
    addSelectedTx,
    onSelectAddTx: handleSelectAddTx,
    onClearAddTx: handleClearAddTx,
    submittingAddEntry: createLending.isPending,
    handleAddEntry,
  };
}
