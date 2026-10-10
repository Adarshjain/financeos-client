'use client';

// "Record lending" anywhere outside the Lendings page (a dashboard shortcut,
// Settle up from a widget): the Lendings page's Add Ledger Entry dialog with
// its own form state, controlled by the caller. A preset seeds the person,
// entry type and amount (Settle up = settleUpEntry(netPosition) + the person).

import { AddLendingDialog } from '@/app/(protected)/loans/lendings/browser/AddLendingDialog';

import { type LendingFormPreset, useAddLendingForm } from './useAddLendingForm';

export interface RecordLendingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: LendingFormPreset;
}

export function RecordLendingDialog({ open, onOpenChange, preset }: RecordLendingDialogProps) {
  const form = useAddLendingForm({ preset, onCreated: () => onOpenChange(false) });
  const handleOpenChange = (next: boolean) => {
    form.setOpen(next);
    onOpenChange(next);
  };

  return (
    <AddLendingDialog
      open={open}
      onOpenChange={handleOpenChange}
      party={form.party}
      setParty={form.setParty}
      entryType={form.entryType}
      setEntryType={form.setEntryType}
      amount={form.amount}
      setAmount={form.setAmount}
      entryDate={form.entryDate}
      setEntryDate={form.setEntryDate}
      expectedReturnDate={form.expectedReturnDate}
      setExpectedReturnDate={form.setExpectedReturnDate}
      notes={form.notes}
      setNotes={form.setNotes}
      selectedTx={form.selectedTx}
      onSelectTx={form.onSelectTx}
      onClearTx={form.onClearTx}
      loading={form.loading}
      onCreateLending={form.handleCreateLending}
    />
  );
}
