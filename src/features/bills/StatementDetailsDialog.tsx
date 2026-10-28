'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Banner,
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  showToast,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { UpdateBillDetailsRequest } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate } from '@/lib/format';
import { useBillMutations } from '@/lib/query/hooks/useBills';

export interface StatementDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  /** The card, as the subtitle names it: "HDFC Regalia Gold ••4321". */
  cardLabel: string;
  /** The statement's date (yyyy-mm-dd) for the subtitle; omitted when unknown. */
  statementDate?: string | null;
  /** What the statement carries today; null where the parser could not read it. */
  totalDue: number | null;
  minimumDue: number | null;
  dueDate: string | null;
}

const asText = (n: number | null) => (n != null ? String(n) : '');

/**
 * Fills in what the statement parser could not read: total due, minimum due and due date. At least
 * one of them has to change. Saved values go to the bill, then a Toast confirms.
 */
export function StatementDetailsDialog({
  open,
  onOpenChange,
  statementId,
  cardLabel,
  statementDate,
  totalDue,
  minimumDue,
  dueDate,
}: StatementDetailsDialogProps) {
  const router = useRouter();
  const { updateDetails } = useBillMutations();
  const today = todayInAppZone();
  const [totalText, setTotal] = React.useState('');
  const [minimumText, setMinimum] = React.useState('');
  const [due, setDue] = React.useState('');
  const [totalError, setTotalError] = React.useState<string | null>(null);
  const [minimumError, setMinimumError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTotal(asText(totalDue));
    setMinimum(asText(minimumDue));
    setDue(dueDate ?? '');
    setTotalError(null);
    setMinimumError(null);
    setFormError(null);
  }, [open, totalDue, minimumDue, dueDate]);

  const invalid = (value: string) => !Number.isFinite(Number(value)) || Number(value) < 0;

  const submit = async () => {
    const body: UpdateBillDetailsRequest = {};
    let valid = true;
    setFormError(null);
    const total = resolveAmountExpression(totalText);
    const minimum = resolveAmountExpression(minimumText);
    setTotal(total);
    setMinimum(minimum);
    if (due && due !== dueDate) body.paymentDueDate = due;
    if (total !== '' && Number(total) !== totalDue) {
      if (invalid(total)) {
        setTotalError('Total due must be zero or more');
        valid = false;
      } else {
        body.totalAmountDue = Number(total);
      }
    }
    if (valid) setTotalError(null);
    let minimumValid = true;
    if (minimum !== '' && Number(minimum) !== minimumDue) {
      if (invalid(minimum)) {
        setMinimumError('Minimum due must be zero or more');
        minimumValid = false;
      } else {
        body.minimumAmountDue = Number(minimum);
      }
    }
    if (minimumValid) setMinimumError(null);
    if (!valid || !minimumValid) return;
    if (Object.keys(body).length === 0) {
      setFormError('Change at least one of the fields');
      return;
    }

    try {
      await updateDetails.mutateAsync({ statementId, body });
      onOpenChange(false);
      showToast('Statement details saved');
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save the statement details'), { tone: 'danger' });
    }
  };

  const dated = statementDate ? formatDate(statementDate, 'list') : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Set statement details"
        description={dated ? `${cardLabel} · statement of ${dated}` : cardLabel}
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: updateDetails.isPending,
        }}
        primary={{ label: 'Save', onSelect: submit, loading: updateDetails.isPending }}
      >
        <DialogBody>
          {formError ? <Banner tone="danger">{formError}</Banner> : null}
          <AmountField
            label="Total due (₹)"
            inputMode="decimal"
            value={totalText}
            {...amountExpressionProps(totalText, setTotal)}
            error={totalError ?? undefined}
          />
          <AmountField
            label="Minimum due"
            optional
            inputMode="decimal"
            value={minimumText}
            {...amountExpressionProps(minimumText, setMinimum)}
            error={minimumError ?? undefined}
          />
          <DateField
            label="Due date"
            today={today}
            value={due}
            onValueChange={(v) => setDue(typeof v === 'string' ? v : '')}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
