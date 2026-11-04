'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { showToast } from '@/components/ds/Toast/Toast';
import { useDiscardGuard } from '@/features/shell/useDiscardGuard';
import { resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import type { LoanResponse } from '@/lib/loan.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import {
  buildCreateLoanRequest,
  emptyLoanValues,
  type LoanFormValues,
  loanProblems,
} from '../loanFormModel';
import { useCreateLoan } from '../useLoanMutations';
import { type LoanFormErrors,LoanFormFields } from './LoanFormFields';

const FORM_ID = 'loan-form';

/** Add loan: the form's fields and checks in a dialog. Saving refreshes the page behind it. */
export function LoanFormDialog({
  onClose,
  prefill,
  onCreated,
}: {
  onClose: () => void;
  /** Fields to start with instead of the empty form. */
  prefill?: Partial<LoanFormValues>;
  /** Runs after the loan is created, before the dialog closes. */
  onCreated?: (loan: LoanResponse) => void | Promise<unknown>;
}) {
  const router = useRouter();
  const today = todayInAppZone();
  const createLoan = useCreateLoan({
    onError: (e) => showToast(getErrorMessage(e, "Couldn't create loan. Try again."), { tone: 'danger' }),
  });
  const { data: accounts } = useAccounts();
  const [values, setValues] = React.useState<LoanFormValues>(() => ({ ...emptyLoanValues(today), ...prefill }));
  const [initial] = React.useState(values);
  const guard = useDiscardGuard({ dirty: JSON.stringify(values) !== JSON.stringify(initial), busy: createLoan.isPending, onClose, what: 'loan' });
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
    const problems = loanProblems(resolved, false);
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length > 0) return;
    try {
      const loan = await createLoan.mutateAsync(buildCreateLoanRequest(resolved));
      showToast('Loan created');
      await onCreated?.(loan);
      onClose();
      router.refresh();
    } catch {
      // onError already surfaced the toast.
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : guard.requestClose())}>
        <Dialog.Content
          size="md"
          title="Add loan"
          secondary={{ label: 'Cancel', onSelect: guard.requestClose, disabled: createLoan.isPending }}
          primary={{ label: 'Add loan', type: 'submit', form: FORM_ID, loading: createLoan.isPending }}
        >
          <Dialog.Body>
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
              <LoanFormFields values={values} errors={errors} accounts={accounts ?? []} today={today} onChange={change} />
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
      {guard.node}
    </>
  );
}
