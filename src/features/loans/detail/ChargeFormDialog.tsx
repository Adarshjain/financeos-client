'use client';

import React from 'react';

import { DateField, Dialog, DialogBody, DialogContent, Select, TextArea, TextField } from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import type { LoanChargeType } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { CHARGE_TYPES } from './entriesModel';
import {
  CHARGE_TRANSACTION_HINT,
  type ChargeFormField,
  type ChargeFormValues,
  chargeProblems,
  emptyChargeValues,
} from './eventFormModel';
import { type ChargeValues, prefillAmount, prefillDate } from './loanRequests';

const FORM_ID = 'loan-charge-form';

export interface ChargeFormDialogProps {
  today: string;
  submitting: boolean;
  /** Records the charge; resolves true when it was saved (the dialog then closes). */
  onSubmit: (values: ChargeValues) => Promise<boolean>;
  onClose: () => void;
}

/** Add an itemized charge: a fee, premium or penalty, optionally tied to a bank debit. */
export function ChargeFormDialog({ today, submitting, onSubmit, onClose }: ChargeFormDialogProps) {
  const [values, setValues] = React.useState<ChargeFormValues>(() => emptyChargeValues(today));
  const [tx, setTx] = React.useState<Transaction | null>(null);
  const [errors, setErrors] = React.useState<Partial<Record<ChargeFormField, string>>>({});

  const change = (patch: Partial<ChargeFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as ChargeFormField[]) delete next[key];
      return next;
    });
  };

  const submit = async () => {
    const problems = chargeProblems(values);
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length > 0) return;
    const saved = await onSubmit({ ...values, transactionId: tx?.id });
    if (saved) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title="Add charge"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: 'Add charge', type: 'submit', form: FORM_ID, loading: submitting }}
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
              label="Charge type"
              options={CHARGE_TYPES}
              value={values.chargeType}
              onValueChange={(v) => change({ chargeType: v as LoanChargeType })}
            />
            <TextField
              label="Amount"
              prefix="₹"
              inputMode="decimal"
              placeholder="5000"
              value={values.amount}
              onValueChange={(v) => change({ amount: sanitizeDecimalInput(v) })}
              error={errors.amount}
            />
            <DateField
              label="Charge date"
              today={today}
              value={values.chargeDate}
              onValueChange={(v) => change({ chargeDate: typeof v === 'string' ? v : '' })}
              error={errors.chargeDate}
            />
            <TextArea
              label="Notes"
              optional
              placeholder="Description"
              minRows={2}
              value={values.notes}
              onValueChange={(notes) => change({ notes })}
            />
            <TransactionPickerField
              value={tx}
              onSelect={(picked) => {
                setTx(picked);
                change({
                  amount: prefillAmount(values.amount, picked),
                  chargeDate: prefillDate(values.chargeDate, picked),
                });
              }}
              onClear={() => setTx(null)}
              type="DEBIT"
              excludeAnyObligationRef
              suggestAmount={values.amount ? Number(values.amount) : null}
              suggestDate={values.chargeDate || null}
              ruleHint={CHARGE_TRANSACTION_HINT}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
