'use client';

import React from 'react';

import { DateField, Select, type SelectOption, TextArea, TextField } from '@/components/ds';
import { type Account, isAccountClosed } from '@/lib/account.types';
import type { LoanType, RateType } from '@/lib/loan.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  LOAN_TYPES,
  type LoanFormField,
  type LoanFormValues,
  NO_PAYMENT_ACCOUNT,
  RATE_TYPES,
} from '../loanFormModel';

const LOAN_TYPE_OPTIONS: SelectOption[] = LOAN_TYPES.map((t) => ({ value: t.value, label: t.label }));
const RATE_TYPE_OPTIONS: SelectOption[] = RATE_TYPES.map((t) => ({ value: t.value, label: t.label }));

export type LoanFormErrors = Partial<Record<LoanFormField, string>>;

function bankOptions(accounts: Account[]): SelectOption[] {
  return [
    { value: NO_PAYMENT_ACCOUNT, label: 'None' },
    ...accounts
      .filter((a) => a.type === 'bank_account' && !isAccountClosed(a))
      .map((a) => ({ value: a.id, label: a.name })),
  ];
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">{children}</div>;
}

export interface LoanFormFieldsProps {
  values: LoanFormValues;
  errors: LoanFormErrors;
  accounts: Account[];
  today: string;
  onChange: (patch: Partial<LoanFormValues>) => void;
  /** Core terms (rate type, principal, rate, tenure, dates, EMI) can no longer be edited. */
  termsLocked?: boolean;
}

/** The loan form's fields, shared by Add loan and Edit loan. */
export function LoanFormFields({ values, errors, accounts, today, onChange, termsLocked = false }: LoanFormFieldsProps) {
  const change = onChange;
  return (
    <>
            <Pair>
              <TextField
                label="Loan name"
                placeholder="e.g. Home Loan HDFC"
                value={values.name}
                onValueChange={(name) => change({ name })}
                error={errors.name}
              />
              <TextField
                label="Lender"
                placeholder="e.g. HDFC Bank"
                value={values.lender}
                onValueChange={(lender) => change({ lender })}
                error={errors.lender}
              />
            </Pair>
            <Pair>
              <Select
                label="Loan type"
                options={LOAN_TYPE_OPTIONS}
                value={values.loanType}
                onValueChange={(v) => change({ loanType: v as LoanType })}
              />
              <Select
                label="Rate type"
                disabled={termsLocked}
                options={RATE_TYPE_OPTIONS}
                value={values.rateType}
                onValueChange={(v) => change({ rateType: v as RateType })}
              />
            </Pair>
            <Pair>
              <TextField
                label="Loan account number"
                optional
                placeholder="e.g. 123456789"
                value={values.loanAccountNumber}
                onValueChange={(loanAccountNumber) => change({ loanAccountNumber })}
              />
              <Select
                label="Payment bank account"
                placeholder="Select bank account"
                options={bankOptions(accounts)}
                value={values.paymentAccountId || undefined}
                onValueChange={(v) => change({ paymentAccountId: v as string })}
              />
            </Pair>
            <div className="grid grid-cols-1 desk:grid-cols-3 gap-space-12">
              <TextField
                label="Principal"
                disabled={termsLocked}
                prefix="₹"
                inputMode="decimal"
                placeholder="1000000"
                value={values.principal}
                onValueChange={(v) => change({ principal: sanitizeDecimalInput(v) })}
                error={errors.principal}
              />
              <TextField
                label="Annual rate"
                disabled={termsLocked}
                suffix="%"
                inputMode="decimal"
                placeholder="8.5"
                value={values.annualRatePct}
                onValueChange={(v) => change({ annualRatePct: sanitizeDecimalInput(v) })}
                error={errors.annualRatePct}
              />
              <TextField
                label="Tenure"
                disabled={termsLocked}
                suffix="months"
                inputMode="numeric"
                placeholder="240"
                value={values.tenureMonths}
                onValueChange={(v) => change({ tenureMonths: v.replace(/\D/g, '') })}
                error={errors.tenureMonths}
              />
            </div>
            <div className="grid grid-cols-1 desk:grid-cols-3 gap-space-12">
              <DateField
                label="Disbursal date"
                disabled={termsLocked}
                today={today}
                value={values.startDate}
                onValueChange={(v) => change({ startDate: typeof v === 'string' ? v : '' })}
              />
              <DateField
                label="First EMI due"
                disabled={termsLocked}
                today={today}
                value={values.firstEmiDate}
                onValueChange={(v) => change({ firstEmiDate: typeof v === 'string' ? v : '' })}
              />
              <TextField
                label="EMI amount"
                disabled={termsLocked}
                optional
                prefix="₹"
                inputMode="decimal"
                placeholder="Auto if blank"
                value={values.emiAmount}
                onValueChange={(v) => change({ emiAmount: sanitizeDecimalInput(v) })}
              />
            </div>
            <TextArea
              label="Notes"
              optional
              placeholder="Optional notes or details..."
              value={values.notes}
              onValueChange={(notes) => change({ notes })}
              minRows={2}
            />
    </>
  );
}
