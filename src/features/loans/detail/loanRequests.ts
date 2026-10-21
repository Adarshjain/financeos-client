import type {
  AdjustmentMode,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
  LoanChargeType,
  LoanEventType,
} from '@/lib/loan.types';

// ---- Picking a transaction fills what is still empty -------------------------------------------

/** The amount field after a transaction is picked: what was typed, else the transaction's amount. */
export function prefillAmount(current: string, tx: { amount: number }): string {
  return current || String(Math.abs(tx.amount));
}

/** The date field after a transaction is picked: what was typed, else the transaction's date. */
export function prefillDate(current: string, tx: { date: string }): string {
  return current || tx.date;
}

// ---- Payment ----------------------------------------------------------------------------------

export interface PaymentValues {
  installmentSeq: number;
  paymentDate: string;
  /** As typed. */
  amount: string;
  transactionId?: string;
}

/** POST /loans/{id}/payments: the installment is marked paid by what was paid, on that day. */
export function buildPaymentRequest(v: PaymentValues): CreateLoanPaymentRequest {
  return {
    installmentSeq: v.installmentSeq,
    paymentDate: v.paymentDate,
    amount: Number(v.amount),
    transactionId: v.transactionId,
  };
}

// ---- Lifecycle event --------------------------------------------------------------------------

export interface EventValues {
  eventType: LoanEventType;
  effectiveDate: string;
  newAnnualRatePct: string;
  amount: string;
  adjustmentMode: AdjustmentMode;
  newEmiOverride: string;
  transactionId?: string;
}

/** Prepayments and foreclosures move money out; a rate change does not. */
export function isCashEvent(eventType: LoanEventType): boolean {
  return eventType === 'prepayment' || eventType === 'foreclosure';
}

/** POST /loans/{id}/events. A foreclosure has no adjustment; an EMI override only applies when the EMI is reduced. */
export function buildEventRequest(v: EventValues): CreateLoanEventRequest {
  return {
    eventType: v.eventType,
    effectiveDate: v.effectiveDate,
    newAnnualRatePct: v.newAnnualRatePct ? Number(v.newAnnualRatePct) : undefined,
    amount: v.amount ? Number(v.amount) : undefined,
    adjustmentMode: v.eventType !== 'foreclosure' ? v.adjustmentMode : undefined,
    newEmiOverride:
      v.eventType !== 'foreclosure' && v.adjustmentMode === 'reduce_emi' && v.newEmiOverride
        ? Number(v.newEmiOverride)
        : undefined,
    transactionId: v.transactionId,
  };
}

// ---- Charge -----------------------------------------------------------------------------------

export interface ChargeValues {
  chargeType: LoanChargeType;
  amount: string;
  chargeDate: string;
  notes: string;
  transactionId?: string;
}

/** POST /loans/{id}/charges. */
export function buildChargeRequest(v: ChargeValues): CreateLoanChargeRequest {
  return {
    chargeType: v.chargeType,
    amount: Number(v.amount),
    chargeDate: v.chargeDate,
    notes: v.notes.trim() || undefined,
    transactionId: v.transactionId,
  };
}
