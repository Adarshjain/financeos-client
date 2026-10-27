'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner, Dialog, DialogBody, DialogContent, showToast } from '@/components/ds';
import { resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import type { LoanResponse } from '@/lib/loan.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { buildUpdateLoanRequest, type LoanFormValues, loanProblems, loanValuesFrom } from '../loanFormModel';
import { useUpdateLoan } from '../useUpdateLoan';
import { type LoanFormErrors, LoanFormFields } from './LoanFormFields';

const FORM_ID = 'loan-edit-form';

/** What the banner says while the core terms are locked (Legacy's wording). */
export const TERMS_LOCKED_NOTE =
  'Core terms (principal, rate, tenure, dates, EMI) are locked because events or payments exist.';

export interface LoanEditDialogProps {
  loan: LoanResponse;
  /** True once an event or a settled payment exists: the core terms can no longer change. */
  termsLocked: boolean;
  onClose: () => void;
}

/** Edit loan: the Add loan fields, filled from the loan. Saving refreshes the page behind it. */
export function LoanEditDialog({ loan, termsLocked, onClose }: LoanEditDialogProps) {
  const router = useRouter();
  const today = todayInAppZone();
  const updateLoan = useUpdateLoan({
    onError: (e) => showToast(getErrorMessage(e, 'Failed to update loan'), { tone: 'danger' }),
  });
  const { data: accounts } = useAccounts();
  const [values, setValues] = React.useState<LoanFormValues>(() => loanValuesFrom(loan, today));
  const [errors, setErrors] = React.useState<LoanFormErrors>({});

  const change = (patch: Partial<LoanFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof LoanFormErrors)[]) delete next[key];
      return next;
    });
  };

  const submit = async () => {
    const resolved = {
      ...values,
      principal: resolveAmountExpression(values.principal),
      emiAmount: resolveAmountExpression(values.emiAmount),
    };
    setValues(resolved);
    const problems = loanProblems(resolved, true);
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length > 0) return;
    try {
      await updateLoan.mutateAsync({ id: loan.id, body: buildUpdateLoanRequest(resolved) });
      showToast('Loan updated successfully');
      onClose();
      router.refresh();
    } catch {
      // onError already surfaced the toast.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="md"
        title="Edit loan"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: updateLoan.isPending }}
        primary={{ label: 'Save changes', type: 'submit', form: FORM_ID, loading: updateLoan.isPending }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {termsLocked ? <Banner tone="warning">{TERMS_LOCKED_NOTE}</Banner> : null}
            <LoanFormFields
              values={values}
              errors={errors}
              accounts={accounts ?? []}
              today={today}
              onChange={change}
              termsLocked={termsLocked}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
