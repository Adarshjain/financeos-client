'use client';

// The "Add Ledger Entry" form for a person picked in the dialog (the Lendings
// page, the Record lending shortcut): its state, the linked-transaction picker
// rules, and the create mutation. A preset (Settle up for a person) seeds the
// person, entry type and amount, and is what a reset returns to.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { todayInAppZone } from '@/lib/date-range';
import type { CounterpartyResponse, CounterpartySelection, CreateLendingRequest } from '@/lib/lending.types';
import { directionOf, fromEntryType, type LendingEntryType } from '@/lib/lendingEntry';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { Transaction } from '@/lib/transaction.types';

export interface LendingFormPreset {
  /** The person the entry is for. */
  counterparty?: CounterpartyResponse;
  entryType?: LendingEntryType;
  amount?: number;
}

interface UseAddLendingFormOptions {
  preset?: LendingFormPreset;
  /** After a successful create (the form has already closed and reset). */
  onCreated?: () => void;
}

function presetParty(preset: LendingFormPreset | undefined): CounterpartySelection | null {
  return preset?.counterparty ? { kind: 'existing', counterparty: preset.counterparty } : null;
}

export function useAddLendingForm({ preset, onCreated }: UseAddLendingFormOptions = {}) {
  const qc = useQueryClient();
  const [open, setOpenState] = useState(false);
  const [party, setParty] = useState<CounterpartySelection | null>(() => presetParty(preset));
  const [entryType, setEntryTypeState] = useState<LendingEntryType>(preset?.entryType ?? 'lent');
  const [amount, setAmount] = useState(preset?.amount != null ? String(preset.amount) : '');
  const [entryDate, setEntryDate] = useState(() => todayInAppZone());
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Fresh dialog each time it opens or closes; clears any leftover picks from
  // a cancelled or just-submitted create (both the trigger button and the
  // dialog's own close/cancel/outside-click route through this setter).
  const setOpen = (next: boolean) => {
    setOpenState(next);
    setSelectedTx(null);
    setParty(presetParty(preset));
    setEntryTypeState(preset?.entryType ?? 'lent');
    if (preset?.amount != null) setAmount(String(preset.amount));
  };

  const setEntryType = (next: LendingEntryType) => {
    // The picker's type filter (DEBIT/CREDIT) is direction-derived, so a
    // previously-selected transaction may no longer be valid once the money
    // flows the other way. Switching principal <-> settlement keeps it.
    if (directionOf(next) !== directionOf(entryType)) setSelectedTx(null);
    setEntryTypeState(next);
  };

  const onSelectTx = (t: Transaction) => {
    setSelectedTx(t);
    if (!amount) setAmount(String(Math.abs(t.amount)));
    if (!entryDate) setEntryDate(t.date);
  };

  const onClearTx = () => setSelectedTx(null);

  const createLending = useMutation({
    mutationFn: (body: CreateLendingRequest) => api.POST('/api/v1/lendings', { body }).then((r) => r.data!),
    onSuccess: () => {
      invalidateLendingQueries(qc);
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    },
    onError: (e) => toastError(e, 'Failed to create lending'),
  });

  const handleCreateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!party) {
      toast.error('Pick a person');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    try {
      await createLending.mutateAsync({
        ...(party.kind === 'new' ? { newCounterpartyName: party.name } : { counterpartyId: party.counterparty.id }),
        ...fromEntryType(entryType),
        amount: Number(amount),
        entryDate,
        expectedReturnDate: expectedReturnDate || undefined,
        transactionId: selectedTx?.id,
        notes: notes.trim() || undefined,
      });
      toast.success('Lending recorded successfully');
      // The next entry starts blank rather than repeating this one's figures.
      setAmount('');
      setNotes('');
      setExpectedReturnDate('');
      setOpen(false);
      onCreated?.();
    } catch {
      // onError already surfaced the toast.
    }
  };

  return {
    open,
    setOpen,
    party,
    setParty,
    entryType,
    setEntryType,
    amount,
    setAmount,
    entryDate,
    setEntryDate,
    expectedReturnDate,
    setExpectedReturnDate,
    notes,
    setNotes,
    selectedTx,
    onSelectTx,
    onClearTx,
    loading: createLending.isPending,
    handleCreateLending,
  };
}
