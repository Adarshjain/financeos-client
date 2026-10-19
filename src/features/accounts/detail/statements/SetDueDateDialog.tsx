'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { DateField, Dialog, DialogBody, DialogContent, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { useBillMutations } from '@/lib/query/hooks/useBills';

export interface SetDueDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  /** "Statement · 5 Oct 2026". */
  statementLabel: string;
  /** The due date the statement has now; null when it has none. */
  dueDate: string | null;
}

/** Sets the payment due date of a statement's bill (the same PATCH the live app uses). */
export function SetDueDateDialog({
  open,
  onOpenChange,
  statementId,
  statementLabel,
  dueDate,
}: SetDueDateDialogProps) {
  const router = useRouter();
  const { updateDetails } = useBillMutations();
  const [value, setValue] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [unchanged, setUnchanged] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValue(dueDate ?? '');
    setTouched(false);
    setUnchanged(false);
  }, [open, dueDate]);

  const error = touched && !value ? 'Enter the due date' : unchanged ? 'Change at least one of the fields' : null;

  const submit = async () => {
    setTouched(true);
    if (!value) return;
    if (value === dueDate) {
      setUnchanged(true);
      return;
    }
    try {
      await updateDetails.mutateAsync({ statementId, body: { paymentDueDate: value } });
      onOpenChange(false);
      showToast('Statement details saved');
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save the statement details'), { tone: 'danger' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Set due date"
        description={statementLabel}
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: updateDetails.isPending,
        }}
        primary={{ label: 'Save', onSelect: submit, loading: updateDetails.isPending }}
      >
        <DialogBody>
          <DateField
            label="Due date"
            today={todayInAppZone()}
            value={value}
            onValueChange={(v) => {
              setValue(typeof v === 'string' ? v : '');
              setUnchanged(false);
            }}
            error={error ?? undefined}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
