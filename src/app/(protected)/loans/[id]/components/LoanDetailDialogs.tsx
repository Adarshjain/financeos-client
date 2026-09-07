'use client';

import { Transaction } from '@/lib/transaction.types';
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
  paymentTx: Transaction | null;
  onSelectPaymentTx: (t: Transaction) => void;
  onClearPaymentTx: () => void;
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
  eventTx: Transaction | null;
  onSelectEventTx: (t: Transaction) => void;
  onClearEventTx: () => void;
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
  chargeTx: Transaction | null;
  onSelectChargeTx: (t: Transaction) => void;
  onClearChargeTx: () => void;
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
  paymentTx,
  onSelectPaymentTx,
  onClearPaymentTx,
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
  eventTx,
  onSelectEventTx,
  onClearEventTx,
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
  chargeTx,
  onSelectChargeTx,
  onClearChargeTx,
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
        paymentTx={paymentTx}
        onSelectPaymentTx={onSelectPaymentTx}
        onClearPaymentTx={onClearPaymentTx}
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
        eventTx={eventTx}
        onSelectEventTx={onSelectEventTx}
        onClearEventTx={onClearEventTx}
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
        chargeTx={chargeTx}
        onSelectChargeTx={onSelectChargeTx}
        onClearChargeTx={onClearChargeTx}
        submittingCharge={submittingCharge}
        onAddCharge={onAddCharge}
      />
    </>
  );
}
