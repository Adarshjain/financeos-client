'use client';

import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Select, type SelectOption } from '@/components/ds/Select/Select';
import { TextArea } from '@/components/ds/TextArea/TextArea';
import { TextField } from '@/components/ds/TextField/TextField';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { AmountField } from '@/components/organisms/AmountField/AmountField';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { amountExpressionProps } from '@/lib/amountExpression';
import type { LoanType, RateType } from '@/lib/loan.types';
import { AccountType } from '@/lib/types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  LOAN_TYPES,
  type LoanFormField,
  type LoanFormValues,
  NO_PAYMENT_ACCOUNT,
  RATE_TYPES,
} from '../loanFormModel';

const PAYMENT_ACCOUNT_TYPES: readonly AccountType[] = [AccountType.BANK_ACCOUNT];

const LOAN_TYPE_OPTIONS: SelectOption[] = LOAN_TYPES.map((t) => ({ value: t.value, label: t.label }));
const RATE_TYPE_OPTIONS: SelectOption[] = RATE_TYPES.map((t) => ({ value: t.value, label: t.label }));

export type LoanFormErrors = Partial<Record<LoanFormField, string>>;

const NO_PAYMENT_OPTION: SelectOption[] = [{ value: NO_PAYMENT_ACCOUNT, label: 'None' }];

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">{children}</div>;
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
                placeholder="e.g. Home loan HDFC"
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
              <AccountPicker
                label="Payment bank account"
                placeholder="Select bank account"
                accounts={accounts.filter((a) => !isAccountClosed(a))}
                types={PAYMENT_ACCOUNT_TYPES}
                leadingOptions={NO_PAYMENT_OPTION}
                value={values.paymentAccountId || null}
                onValueChange={(v) => change({ paymentAccountId: v ?? '' })}
              />
            </Pair>
            <div className="grid grid-cols-1 desk:grid-cols-3 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
              <AmountField
                label="Principal"
                disabled={termsLocked}
                prefix="₹"
                inputMode="decimal"
                placeholder="1000000"
                value={values.principal}
                {...amountExpressionProps(values.principal, (v) => change({ principal: v }))}
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
            <div className="grid grid-cols-1 desk:grid-cols-3 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
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
              <AmountField
                label="EMI amount"
                disabled={termsLocked}
                optional
                prefix="₹"
                inputMode="decimal"
                placeholder="Auto if blank"
                value={values.emiAmount}
                {...amountExpressionProps(values.emiAmount, (v) => change({ emiAmount: v }))}
                error={errors.emiAmount}
              />
            </div>
            <TextArea
              label="Notes"
              optional
              placeholder="Optional notes or details…"
              value={values.notes}
              onValueChange={(notes) => change({ notes })}
              minRows={2}
            />
    </>
  );
}
