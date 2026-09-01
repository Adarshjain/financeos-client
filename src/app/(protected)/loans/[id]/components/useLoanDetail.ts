'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  addLoanChargeAction,
  addLoanEventAction,
  addLoanPaymentAction,
  addLoanPaymentsBatchAction,
  deleteLoanChargeAction,
  deleteLoanEventAction,
  deleteLoanPaymentAction,
  fetchLoanDetailAction,
  fetchLoanScheduleAction,
  fetchMatchSuggestionsAction,
} from '@/actions/loans';
import {
  AdjustmentMode,
  InstallmentDto,
  LoanChargeType,
  LoanDetailResponse,
  LoanEventType,
  MatchSuggestionsResponse,
} from '@/lib/types';

interface UseLoanDetailProps {
  initialDetail: LoanDetailResponse;
  initialSchedule: InstallmentDto[];
}

export function useLoanDetail({
  initialDetail,
  initialSchedule,
}: UseLoanDetailProps) {
  const [detail, setDetail] = useState<LoanDetailResponse>(initialDetail);
  const [schedule, setSchedule] = useState<InstallmentDto[]>(initialSchedule);

  const [editOpen, setEditOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentDto | null>(null);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestionsResponse | null>(null);

  const [expandedFYs, setExpandedFYs] = useState<Record<string, boolean>>({});

  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [eventType, setEventType] = useState<LoanEventType>('rate_change');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newAnnualRatePct, setNewAnnualRatePct] = useState('');
  const [eventAmount, setEventAmount] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('reduce_tenure');
  const [newEmiOverride, setNewEmiOverride] = useState('');
  const [eventTxId, setEventTxId] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const [chargeType, setChargeType] = useState<LoanChargeType>('processing_fee');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDate, setChargeDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [chargeNotes, setChargeNotes] = useState('');
  const [chargeTxId, setChargeTxId] = useState('');
  const [submittingCharge, setSubmittingCharge] = useState(false);

  const loan = detail.loan;
  const hasEventsOrPayments =
    detail.events.length > 0 || schedule.some((i) => i.status === 'settled');

  const refreshData = async () => {
    const [dRes, sRes] = await Promise.all([
      fetchLoanDetailAction(loan.id),
      fetchLoanScheduleAction(loan.id),
    ]);
    if (dRes.success) setDetail(dRes.data);
    if (sRes.success) setSchedule(sRes.data.installments);
  };

  const getFYGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyStart = month >= 3 ? year : year - 1;
    return `FY ${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
  };

  const today = new Date();
  const currentFY = getFYGroupKey(today.toISOString().split('T')[0]);

  const toggleFY = (fy: string) => {
    setExpandedFYs((prev) => ({
      ...prev,
      [fy]: prev[fy] === undefined ? fy !== currentFY : !prev[fy],
    }));
  };

  const handleOpenMarkPaid = (inst: InstallmentDto) => {
    setSelectedInstallment(inst);
    setPaymentDate(inst.dueDate);
    setPaymentAmount(String(inst.emi));
    setPaymentTxId('');
    setMarkPaidOpen(true);
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    setSubmittingPayment(true);
    try {
      const res = await addLoanPaymentAction(loan.id, {
        installmentSeq: selectedInstallment.seq,
        paymentDate,
        amount: Number(paymentAmount),
        transactionId: paymentTxId.trim() || undefined,
      });
      if (res.success) {
        toast.success(`Installment #${selectedInstallment.seq} marked as paid`);
        setMarkPaidOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleUnlinkPayment = async (paymentId: string) => {
    const res = await deleteLoanPaymentAction(loan.id, paymentId);
    if (res.success) {
      toast.success('Payment unlinked');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      const res = await addLoanEventAction(loan.id, {
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
        transactionId: eventTxId.trim() || undefined,
      });
      if (res.success) {
        toast.success('Event recorded');
        setAddEventOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await deleteLoanEventAction(loan.id, eventId);
    if (res.success) {
      toast.success('Event deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCharge(true);
    try {
      const res = await addLoanChargeAction(loan.id, {
        chargeType,
        amount: Number(chargeAmount),
        chargeDate,
        notes: chargeNotes.trim() || undefined,
        transactionId: chargeTxId.trim() || undefined,
      });
      if (res.success) {
        toast.success('Charge added');
        setAddChargeOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingCharge(false);
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    const res = await deleteLoanChargeAction(loan.id, chargeId);
    if (res.success) {
      toast.success('Charge deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleFindMatches = async () => {
    setMatchLoading(true);
    try {
      const res = await fetchMatchSuggestionsAction(loan.id);
      if (res.success) {
        setMatchSuggestions(res.data);
        if (res.data.suggestions.every((s) => s.candidates.length === 0)) {
          toast.info('No matching bank transactions found (±7 days)');
        }
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setMatchLoading(false);
    }
  };

  const handleConfirmMatch = async (
    seq: number,
    date: string,
    amount: number,
    txId: string
  ) => {
    const res = await addLoanPaymentAction(loan.id, {
      installmentSeq: seq,
      paymentDate: date,
      amount,
      transactionId: txId,
    });
    if (res.success) {
      toast.success(`Matched installment #${seq}`);
      await refreshData();
      await handleFindMatches();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleConfirmAllMatches = async () => {
    if (!matchSuggestions) return;
    const itemsToConfirm = matchSuggestions.suggestions
      .filter((s) => s.candidates.length > 0)
      .map((s) => ({
        installmentSeq: s.installmentSeq,
        paymentDate: s.candidates[0].date,
        amount:
          s.candidates[0].amount < 0
            ? Math.abs(s.candidates[0].amount)
            : s.candidates[0].amount,
        transactionId: s.candidates[0].id,
      }));

    if (itemsToConfirm.length === 0) return;

    const res = await addLoanPaymentsBatchAction(loan.id, {
      items: itemsToConfirm,
    });
    if (res.success) {
      toast.success(`Batch confirmed ${res.data.created} payments`);
      await refreshData();
      await handleFindMatches();
    } else {
      toast.error(res.error.message);
    }
  };

  return {
    detail,
    schedule,
    editOpen,
    setEditOpen,
    addEventOpen,
    setAddEventOpen,
    addChargeOpen,
    setAddChargeOpen,
    markPaidOpen,
    setMarkPaidOpen,
    selectedInstallment,
    matchLoading,
    matchSuggestions,
    expandedFYs,
    paymentDate,
    setPaymentDate,
    paymentAmount,
    setPaymentAmount,
    paymentTxId,
    setPaymentTxId,
    submittingPayment,
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
    eventTxId,
    setEventTxId,
    submittingEvent,
    chargeType,
    setChargeType,
    chargeAmount,
    setChargeAmount,
    chargeDate,
    setChargeDate,
    chargeNotes,
    setChargeNotes,
    chargeTxId,
    setChargeTxId,
    submittingCharge,
    loan,
    hasEventsOrPayments,
    currentFY,
    refreshData,
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
  };
}
