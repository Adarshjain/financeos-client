'use client';

import { useState } from 'react';

import { Transaction } from '@/lib/transaction.types';
import { LoanEventType } from '@/lib/types';

interface UseLoanTransactionLinksProps {
  paymentAmount: string;
  setPaymentAmount: (a: string) => void;
  paymentDate: string;
  setPaymentDate: (d: string) => void;
  chargeAmount: string;
  setChargeAmount: (a: string) => void;
  chargeDate: string;
  setChargeDate: (d: string) => void;
  eventAmount: string;
  setEventAmount: (a: string) => void;
  effectiveDate: string;
  setEffectiveDate: (d: string) => void;
  /** Raw dialog-open/eventType state setters from useLoanDetail — wrapped
   *  here so every place that flips them also resets the matching picker. */
  setMarkPaidOpenRaw: (open: boolean) => void;
  setAddEventOpenRaw: (open: boolean) => void;
  setAddChargeOpenRaw: (open: boolean) => void;
  setEventTypeRaw: (t: LoanEventType) => void;
}

/**
 * Split out of useLoanDetail to keep that hook under the file-length
 * convention — owns the three loan dialogs' TransactionPicker selections
 * (payment/charge/event): the picked `Transaction | null`, amount/date
 * prefill-when-empty on selection, and every reset each field needs (its
 * dialog opening/closing — including a successful submit, which closes via
 * these same wrapped setters — or, for the event dialog only, an
 * `eventType` change, since the picker's type filter is derived from it).
 */
export function useLoanTransactionLinks({
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
}: UseLoanTransactionLinksProps) {
  const [paymentTx, setPaymentTx] = useState<Transaction | null>(null);
  const [chargeTx, setChargeTx] = useState<Transaction | null>(null);
  const [eventTx, setEventTx] = useState<Transaction | null>(null);

  const onSelectPaymentTx = (t: Transaction) => {
    setPaymentTx(t);
    if (!paymentAmount) setPaymentAmount(String(Math.abs(t.amount)));
    if (!paymentDate) setPaymentDate(t.date);
  };
  const onClearPaymentTx = () => setPaymentTx(null);

  const onSelectChargeTx = (t: Transaction) => {
    setChargeTx(t);
    if (!chargeAmount) setChargeAmount(String(Math.abs(t.amount)));
    if (!chargeDate) setChargeDate(t.date);
  };
  const onClearChargeTx = () => setChargeTx(null);

  const onSelectEventTx = (t: Transaction) => {
    setEventTx(t);
    if (!eventAmount) setEventAmount(String(Math.abs(t.amount)));
    if (!effectiveDate) setEffectiveDate(t.date);
  };
  const onClearEventTx = () => setEventTx(null);

  const setMarkPaidOpen = (open: boolean) => {
    setMarkPaidOpenRaw(open);
    setPaymentTx(null);
  };

  const setAddEventOpen = (open: boolean) => {
    setAddEventOpenRaw(open);
    setEventTx(null);
  };

  const setAddChargeOpen = (open: boolean) => {
    setAddChargeOpenRaw(open);
    setChargeTx(null);
  };

  // The event picker's type filter (DEBIT for prepayment/foreclosure, no
  // filter for rate_change) is derived from eventType — an already-picked
  // transaction may no longer make sense once it changes.
  const setEventType = (t: LoanEventType) => {
    setEventTypeRaw(t);
    setEventTx(null);
  };

  return {
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
  };
}
