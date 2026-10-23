'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  showToast,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { useBillMutations } from '@/lib/query/hooks/useBills';

import {
  checkDetails,
  type DetailsErrors,
  type DetailsField,
  type DetailsForm,
  detailsFormFrom,
  type DetailsValues,
} from './detailModel';

export interface EditDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  /** "Statement · 5 Oct 2026". */
  statementLabel: string;
  /** The values the statement has now; null for a missing one. */
  initial: DetailsValues;
}

/** Edits the period, due date and amounts of a card statement (the same PATCH the live app uses); sends only what changed. */
export function EditDetailsDialog({
  open,
  onOpenChange,
  statementId,
  statementLabel,
  initial,
}: EditDetailsDialogProps) {
  const router = useRouter();
  const { updateDetails } = useBillMutations();
  const [form, setForm] = React.useState<DetailsForm>(() =>
    detailsFormFrom(initial)
  );
  const [errors, setErrors] = React.useState<DetailsErrors>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(detailsFormFrom(initial));
    setErrors({});
    // Reset only when the dialog opens or another statement is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, statementId]);

  const set = (field: DetailsField, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors({});
  };

  const submit = async () => {
    const resolved: DetailsForm = {
      ...form,
      totalDue: resolveAmountExpression(form.totalDue),
      minimumDue: resolveAmountExpression(form.minimumDue),
    };
    setForm(resolved);
    const { body, errors: found } = checkDetails(resolved, initial);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await updateDetails.mutateAsync({ statementId, body });
      onOpenChange(false);
      showToast('Statement details saved');
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save the statement details'), {
        tone: 'danger',
      });
    }
  };

  const today = todayInAppZone();
  const date = (field: DetailsField, label: string, extraError?: string) => (
    <DateField
      label={label}
      today={today}
      value={form[field]}
      onValueChange={(v) => set(field, typeof v === 'string' ? v : '')}
      error={errors[field] ?? extraError}
    />
  );
  const amount = (field: DetailsField, label: string) => (
    <AmountField
      label={label}
      prefix="₹"
      inputMode="decimal"
      value={form[field]}
      {...amountExpressionProps(form[field], (v) => set(field, v))}
      error={errors[field]}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Edit details"
        description={statementLabel}
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: updateDetails.isPending,
        }}
        primary={{
          label: 'Save',
          onSelect: submit,
          loading: updateDetails.isPending,
        }}
      >
        <DialogBody>
          {date('periodStart', 'Period start')}
          {date('periodEnd', 'Period end')}
          {date('dueDate', 'Due date', errors.form)}
          {amount('totalDue', 'Total due')}
          {amount('minimumDue', 'Minimum due')}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
