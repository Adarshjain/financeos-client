'use client';

import {
  AdjustmentMode,
  InstallmentDto,
  LoanChargeType,
  LoanEventType,
} from '@/lib/types';

import { AddChargeDialog } from './AddChargeDialog';
import { RecordEventDialog } from './RecordEventDialog';
import { SettlePaymentDialog } from './SettlePaymentDialog';

interface LoanDetailDialogsProps {
  markPaidOpen: boolean;
  setMarkPaidOpen: (open: boolean) => void;
  selectedInstallment: InstallmentDto | null;
  paymentDate: string;
  setPaymentDate: (d: string) => void;
  paymentAmount: string;
  setPaymentAmount: (a: string) => void;
  paymentTxId: string;
  setPaymentTxId: (id: string) => void;
  submittingPayment: boolean;
  onSettlePayment: (e: React.FormEvent) => Promise<void>;

  addEventOpen: boolean;
  setAddEventOpen: (open: boolean) => void;
  eventType: LoanEventType;
  setEventType: (t: LoanEventType) => void;
  effectiveDate: string;
  setEffectiveDate: (d: string) => void;
  newAnnualRatePct: string;
  setNewAnnualRatePct: (r: string) => void;
  eventAmount: string;
  setEventAmount: (a: string) => void;
  adjustmentMode: AdjustmentMode;
  setAdjustmentMode: (m: AdjustmentMode) => void;
  newEmiOverride: string;
  setNewEmiOverride: (o: string) => void;
  eventTxId: string;
  setEventTxId: (id: string) => void;
  submittingEvent: boolean;
  onAddEvent: (e: React.FormEvent) => Promise<void>;

  addChargeOpen: boolean;
  setAddChargeOpen: (open: boolean) => void;
  chargeType: LoanChargeType;
  setChargeType: (t: LoanChargeType) => void;
  chargeAmount: string;
  setChargeAmount: (a: string) => void;
  chargeDate: string;
  setChargeDate: (d: string) => void;
  chargeNotes: string;
  setChargeNotes: (n: string) => void;
  chargeTxId: string;
  setChargeTxId: (id: string) => void;
  submittingCharge: boolean;
  onAddCharge: (e: React.FormEvent) => Promise<void>;
}

export function LoanDetailDialogs({
  markPaidOpen,
  setMarkPaidOpen,
  selectedInstallment,
  paymentDate,
  setPaymentDate,
  paymentAmount,
  setPaymentAmount,
  paymentTxId,
  setPaymentTxId,
  submittingPayment,
  onSettlePayment,
  addEventOpen,
  setAddEventOpen,
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
  onAddEvent,
  addChargeOpen,
  setAddChargeOpen,
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
  onAddCharge,
}: LoanDetailDialogsProps) {
  return (
    <>
      <SettlePaymentDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        selectedInstallment={selectedInstallment}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentTxId={paymentTxId}
        setPaymentTxId={setPaymentTxId}
        submittingPayment={submittingPayment}
        onSettlePayment={onSettlePayment}
      />

      <RecordEventDialog
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        eventType={eventType}
        setEventType={setEventType}
        effectiveDate={effectiveDate}
        setEffectiveDate={setEffectiveDate}
        newAnnualRatePct={newAnnualRatePct}
        setNewAnnualRatePct={setNewAnnualRatePct}
        eventAmount={eventAmount}
        setEventAmount={setEventAmount}
        adjustmentMode={adjustmentMode}
        setAdjustmentMode={setAdjustmentMode}
        newEmiOverride={newEmiOverride}
        setNewEmiOverride={setNewEmiOverride}
        eventTxId={eventTxId}
        setEventTxId={setEventTxId}
        submittingEvent={submittingEvent}
        onAddEvent={onAddEvent}
      />

      <AddChargeDialog
        open={addChargeOpen}
        onOpenChange={setAddChargeOpen}
        chargeType={chargeType}
        setChargeType={setChargeType}
        chargeAmount={chargeAmount}
        setChargeAmount={setChargeAmount}
        chargeDate={chargeDate}
        setChargeDate={setChargeDate}
        chargeNotes={chargeNotes}
        setChargeNotes={setChargeNotes}
        chargeTxId={chargeTxId}
        setChargeTxId={setChargeTxId}
        submittingCharge={submittingCharge}
        onAddCharge={onAddCharge}
      />
    </>
  );
}
