'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  AdjustmentMode,
  InstallmentDto,
  LoanChargeType,
  LoanEventType,
} from '@/lib/types';

import { useLoanMatchActions } from './useLoanMatchActions';
import { useLoanMutations } from './useLoanMutations';
import { useLoanQueries } from './useLoanQueries';
import { useLoanTransactionLinks } from './useLoanTransactionLinks';

interface UseLoanDetailProps {
  loanId: string;
}

export function useLoanDetail({ loanId }: UseLoanDetailProps) {
  const {
    detail,
    loan,
    schedule,
    hasEventsOrPayments,
    isLoading,
    error,
    matchLoading,
    matchSuggestions,
    refetchMatches,
    expandedFYs,
    currentFY,
    toggleFY,
  } = useLoanQueries({ loanId });

  const mutations = useLoanMutations(loanId);

  const [editOpen, setEditOpen] = useState(false);
  const [addEventOpenRaw, setAddEventOpenRaw] = useState(false);
  const [addChargeOpenRaw, setAddChargeOpenRaw] = useState(false);
  const [markPaidOpenRaw, setMarkPaidOpenRaw] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<InstallmentDto | null>(null);

  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const [eventType, setEventTypeRaw] = useState<LoanEventType>('rate_change');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newAnnualRatePct, setNewAnnualRatePct] = useState('');
  const [eventAmount, setEventAmount] = useState('');
  const [adjustmentMode, setAdjustmentMode] =
    useState<AdjustmentMode>('reduce_tenure');
  const [newEmiOverride, setNewEmiOverride] = useState('');

  const [chargeType, setChargeType] =
    useState<LoanChargeType>('processing_fee');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDate, setChargeDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [chargeNotes, setChargeNotes] = useState('');

  const {
    paymentTx,
    onSelectPaymentTx,
    onClearPaymentTx,
    chargeTx,
    onSelectChargeTx,
    onClearChargeTx,
    eventTx,
    onSelectEventTx,
    onClearEventTx,
    setMarkPaidOpen,
    setAddEventOpen,
    setAddChargeOpen,
    setEventType,
  } = useLoanTransactionLinks({
    paymentAmount,
    setPaymentAmount,
    paymentDate,
    setPaymentDate,
    chargeAmount,
    setChargeAmount,
    chargeDate,
    setChargeDate,
    eventAmount,
    setEventAmount,
    effectiveDate,
    setEffectiveDate,
    setMarkPaidOpenRaw,
    setAddEventOpenRaw,
    setAddChargeOpenRaw,
    setEventTypeRaw,
  });

  const handleOpenMarkPaid = (inst: InstallmentDto) => {
    setSelectedInstallment(inst);
    setPaymentDate(inst.dueDate);
    setPaymentAmount(String(inst.emi));
    setMarkPaidOpen(true);
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    try {
      await mutations.addPayment.mutateAsync({
        installmentSeq: selectedInstallment.seq,
        paymentDate,
        amount: Number(paymentAmount),
        transactionId: paymentTx?.id,
      });
      toast.success(`Installment #${selectedInstallment.seq} marked as paid`);
      setMarkPaidOpen(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleUnlinkPayment = async (paymentId: string) => {
    try {
      await mutations.deletePayment.mutateAsync(paymentId);
      toast.success('Payment unlinked');
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutations.addEvent.mutateAsync({
        eventType,
        effectiveDate,
        newAnnualRatePct: newAnnualRatePct
          ? Number(newAnnualRatePct)
          : undefined,
        amount: eventAmount ? Number(eventAmount) : undefined,
        adjustmentMode:
          eventType !== 'foreclosure' ? adjustmentMode : undefined,
        newEmiOverride:
          eventType !== 'foreclosure' &&
          adjustmentMode === 'reduce_emi' &&
          newEmiOverride
            ? Number(newEmiOverride)
            : undefined,
        transactionId: eventTx?.id,
      });
      toast.success('Event recorded');
      setAddEventOpen(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await mutations.deleteEvent.mutateAsync(eventId);
      toast.success('Event deleted');
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutations.addCharge.mutateAsync({
        chargeType,
        amount: Number(chargeAmount),
        chargeDate,
        notes: chargeNotes.trim() || undefined,
        transactionId: chargeTx?.id,
      });
      toast.success('Charge added');
      setAddChargeOpen(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    try {
      await mutations.deleteCharge.mutateAsync(chargeId);
      toast.success('Charge deleted');
    } catch {
      // onError already surfaced the toast.
    }
  };

  const { handleFindMatches, handleConfirmMatch, handleConfirmAllMatches } =
    useLoanMatchActions({ matchSuggestions, refetchMatches, mutations });

  const handleCloseLoan = async () => {
    try {
      await mutations.closeLoan.mutateAsync();
      toast.success('Loan closed');
    } catch {
      // onError already surfaced the toast; ConfirmationDialog still closes.
    }
  };

  const handleReopenLoan = async () => {
    try {
      await mutations.reopenLoan.mutateAsync();
      toast.success('Loan reopened');
    } catch {
      // onError already surfaced the toast; ConfirmationDialog still closes.
    }
  };

  return {
    detail,
    schedule,
    isLoading,
    error,
    editOpen,
    setEditOpen,
    addEventOpen: addEventOpenRaw,
    setAddEventOpen,
    addChargeOpen: addChargeOpenRaw,
    setAddChargeOpen,
    markPaidOpen: markPaidOpenRaw,
    setMarkPaidOpen,
    selectedInstallment,
    matchLoading,
    matchSuggestions,
    expandedFYs,
    paymentDate,
    setPaymentDate,
    paymentAmount,
    setPaymentAmount,
    paymentTx,
    onSelectPaymentTx,
    onClearPaymentTx,
    submittingPayment: mutations.addPayment.isPending,
    eventType,
    setEventType,
    effectiveDate,
    setEffectiveDate,
    newAnnualRatePct,
    setNewAnnualRatePct,
    eventAmount,
    setEventAmount,
    adjustmentMode,
    setAdjustmentMode,
    newEmiOverride,
    setNewEmiOverride,
    eventTx,
    onSelectEventTx,
    onClearEventTx,
    submittingEvent: mutations.addEvent.isPending,
    chargeType,
    setChargeType,
    chargeAmount,
    setChargeAmount,
    chargeDate,
    setChargeDate,
    chargeNotes,
    setChargeNotes,
    chargeTx,
    onSelectChargeTx,
    onClearChargeTx,
    submittingCharge: mutations.addCharge.isPending,
    loan,
    hasEventsOrPayments,
    currentFY,
    toggleFY,
    handleOpenMarkPaid,
    handleSettlePayment,
    handleUnlinkPayment,
    handleAddEvent,
    handleDeleteEvent,
    handleAddCharge,
    handleDeleteCharge,
    handleFindMatches,
    handleConfirmMatch,
    handleConfirmAllMatches,
    handleCloseLoan,
    handleReopenLoan,
    deleteLoanMutation: mutations.deleteLoan,
  };
}
