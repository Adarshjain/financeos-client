'use client';

import React from 'react';

import { DateField, Dialog, DialogBody, DialogContent, Select, TextField } from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import type { LoanEventType } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { ADJUSTMENT_MODES, EVENT_TYPES } from './entriesModel';
import {
  emptyEventValues,
  type EventFormField,
  type EventFormValues,
  eventProblems,
  eventTransactionHint,
} from './eventFormModel';
import { type EventValues, isCashEvent, prefillAmount, prefillDate } from './loanRequests';

const FORM_ID = 'loan-event-form';

export interface EventFormDialogProps {
  today: string;
  /** The type the form opens on (Prepay and the Add menu pick one). */
  initialType: LoanEventType;
  submitting: boolean;
  /** Records the event; resolves true when it was saved (the dialog then closes). */
  onSubmit: (values: EventValues) => Promise<boolean>;
  onClose: () => void;
}

/** Record a lifecycle event: a rate change, a prepayment or a foreclosure, optionally tied to a bank debit. */
export function EventFormDialog({ today, initialType, submitting, onSubmit, onClose }: EventFormDialogProps) {
  const [values, setValues] = React.useState<EventFormValues>(() => emptyEventValues(today, initialType));
  const [tx, setTx] = React.useState<Transaction | null>(null);
  const [errors, setErrors] = React.useState<Partial<Record<EventFormField, string>>>({});
  const cash = isCashEvent(values.eventType);

  const change = (patch: Partial<EventFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as EventFormField[]) delete next[key];
      return next;
    });
  };

  const submit = async () => {
    const problems = eventProblems(values);
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length > 0) return;
    const saved = await onSubmit({ ...values, transactionId: tx?.id });
    if (saved) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title="Record event"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: 'Record event', type: 'submit', form: FORM_ID, loading: submitting }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Select
              label="Event type"
              options={EVENT_TYPES}
              value={values.eventType}
              onValueChange={(v) => {
                change({ eventType: v as LoanEventType });
                // The debit filter follows the type; a debit picked under another type may no longer fit.
                setTx(null);
              }}
            />
            <DateField
              label="Effective date"
              today={today}
              value={values.effectiveDate}
              onValueChange={(v) => change({ effectiveDate: typeof v === 'string' ? v : '' })}
              error={errors.effectiveDate}
            />
            {values.eventType === 'rate_change' ? (
              <TextField
                label="New annual rate"
                suffix="%"
                inputMode="decimal"
                placeholder="9.25"
                value={values.newAnnualRatePct}
                onValueChange={(v) => change({ newAnnualRatePct: sanitizeDecimalInput(v) })}
                error={errors.newAnnualRatePct}
              />
            ) : null}
            {cash ? (
              <TextField
                label="Amount"
                prefix="₹"
                inputMode="decimal"
                placeholder="100000"
                value={values.amount}
                onValueChange={(v) => change({ amount: sanitizeDecimalInput(v) })}
                error={errors.amount}
              />
            ) : null}
            {values.eventType !== 'foreclosure' ? (
              <Select
                label="Adjustment mode"
                options={ADJUSTMENT_MODES}
                value={values.adjustmentMode}
                onValueChange={(v) => change({ adjustmentMode: v as EventFormValues['adjustmentMode'] })}
              />
            ) : null}
            {values.eventType !== 'foreclosure' && values.adjustmentMode === 'reduce_emi' ? (
              <TextField
                label="New EMI override"
                optional
                prefix="₹"
                inputMode="decimal"
                placeholder="Auto if blank"
                value={values.newEmiOverride}
                onValueChange={(v) => change({ newEmiOverride: sanitizeDecimalInput(v) })}
              />
            ) : null}
            <TransactionPickerField
              value={tx}
              onSelect={(picked) => {
                setTx(picked);
                change({
                  amount: prefillAmount(values.amount, picked),
                  effectiveDate: prefillDate(values.effectiveDate, picked),
                });
              }}
              onClear={() => setTx(null)}
              type={cash ? 'DEBIT' : null}
              excludeAnyObligationRef
              suggestAmount={cash && values.amount ? Number(values.amount) : null}
              suggestDate={values.effectiveDate || null}
              ruleHint={eventTransactionHint(values.eventType)}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
