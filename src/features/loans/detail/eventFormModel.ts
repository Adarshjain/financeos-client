import type { AdjustmentMode, LoanChargeType, LoanEventType } from '@/lib/loan.types';

import { isCashEvent } from './loanRequestsModel';

export interface EventFormValues {
  eventType: LoanEventType;
  effectiveDate: string;
  newAnnualRatePct: string;
  amount: string;
  adjustmentMode: AdjustmentMode;
  newEmiOverride: string;
}

export type EventFormField = 'effectiveDate' | 'newAnnualRatePct' | 'amount' | 'newEmiOverride';

export function emptyEventValues(today: string, eventType: LoanEventType = 'rate_change'): EventFormValues {
  return {
    eventType,
    effectiveDate: today,
    newAnnualRatePct: '',
    amount: '',
    adjustmentMode: 'reduce_tenure',
    newEmiOverride: '',
  };
}

function isPositive(text: string): boolean {
  return text !== '' && Number.isFinite(Number(text)) && Number(text) > 0;
}

/** What stops the event form from saving: its date, and the rate or the amount its type needs. */
export function eventProblems(v: EventFormValues): { field: EventFormField; message: string }[] {
  const problems: { field: EventFormField; message: string }[] = [];
  if (!v.effectiveDate) problems.push({ field: 'effectiveDate', message: 'Enter the effective date' });
  if (v.eventType === 'rate_change' && !isPositive(v.newAnnualRatePct)) {
    problems.push({ field: 'newAnnualRatePct', message: 'Enter the new annual rate' });
  }
  if (isCashEvent(v.eventType) && !isPositive(v.amount)) {
    problems.push({ field: 'amount', message: 'Enter the amount' });
  }
  const overridesEmi = v.eventType !== 'foreclosure' && v.adjustmentMode === 'reduce_emi';
  if (overridesEmi && v.newEmiOverride !== '' && !isPositive(v.newEmiOverride)) {
    problems.push({ field: 'newEmiOverride', message: 'Enter the new EMI amount' });
  }
  return problems;
}

export interface ChargeFormValues {
  chargeType: LoanChargeType;
  amount: string;
  chargeDate: string;
  notes: string;
}

export type ChargeFormField = 'amount' | 'chargeDate';

export function emptyChargeValues(today: string): ChargeFormValues {
  return { chargeType: 'processing_fee', amount: '', chargeDate: today, notes: '' };
}

/** What stops the charge form from saving: an amount above zero and a date. */
export function chargeProblems(v: ChargeFormValues): { field: ChargeFormField; message: string }[] {
  const problems: { field: ChargeFormField; message: string }[] = [];
  if (!isPositive(v.amount)) problems.push({ field: 'amount', message: 'Enter the amount' });
  if (!v.chargeDate) problems.push({ field: 'chargeDate', message: 'Enter the charge date' });
  return problems;
}

/** The hint under an empty transaction list, by what the form records. */
export function eventTransactionHint(eventType: LoanEventType): string {
  return isCashEvent(eventType)
    ? 'Prepayments and foreclosures link money-out (debit) transactions'
    : 'Rate changes rarely have a linked transaction, but you can still link one';
}

export const PAYMENT_TRANSACTION_HINT = 'EMI settlements link money-out (debit) transactions';
export const CHARGE_TRANSACTION_HINT = 'Charges link money-out (debit) transactions';
