'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  SegmentedControl,
  showToast,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { MarkBillPaidRequest } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { formatMoney } from '@/lib/format';
import { useBillMutations } from '@/lib/query/hooks/useBills';

export interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  /** The card's name, for the subtitle. */
  cardName: string;
  /** What is left to pay; null when the statement carries no amount. */
  remaining: number | null;
  /** The bill was marked paid, or that was undone: what the caller holds about it is stale. */
  onMarked?: () => void;
}

type Mode = 'full' | 'part';

const MODES = [
  { value: 'full', label: 'Paid in full' },
  { value: 'part', label: 'Part payment' },
] as const;

/**
 * Marks a statement paid by hand: in full by default, or a part payment. The paid date defaults to
 * today and can never be in the future (the server rejects it too). Success is a Toast with Undo.
 */
export function MarkPaidDialog({
  open,
  onOpenChange,
  statementId,
  cardName,
  remaining,
  onMarked,
}: MarkPaidDialogProps) {
  const router = useRouter();
  const { markPaid, unmarkPaid } = useBillMutations();
  const today = todayInAppZone();
  const [mode, setMode] = React.useState<Mode>('full');
  const [amount, setAmount] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(today);
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [dateError, setDateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setMode('full');
    setAmount('');
    setPaidOn(todayInAppZone());
    setAmountError(null);
    setDateError(null);
  }, [open]);

  const undo = async () => {
    try {
      await unmarkPaid.mutateAsync(statementId);
      showToast('Payment mark removed');
      router.refresh();
      onMarked?.();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't undo the payment. Try again."), { tone: 'danger' });
    }
  };

  const submit = async () => {
    const body: MarkBillPaidRequest = {};
    let valid = true;
    if (mode === 'part') {
      const resolvedAmount = resolveAmountExpression(amount);
      if (resolvedAmount !== amount) setAmount(resolvedAmount);
      const parsed = Number(resolvedAmount);
      if (!resolvedAmount || !Number.isFinite(parsed) || parsed <= 0) {
        setAmountError('Enter the amount you paid');
        valid = false;
      } else {
        setAmountError(null);
        body.amount = parsed;
      }
    }
    if (paidOn && paidOn > today) {
      setDateError('Enter a paid date that is not in the future.');
      valid = false;
    } else {
      setDateError(null);
      if (paidOn) body.paidOn = paidOn;
    }
    if (!valid) return;

    try {
      await markPaid.mutateAsync({ statementId, body });
      onOpenChange(false);
      showToast(mode === 'part' ? 'Partial payment recorded' : 'Bill marked as paid', {
        action: { label: 'Undo', onSelect: undo },
      });
      router.refresh();
      onMarked?.();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't mark the bill paid. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="Mark bill as paid"
        description={
          remaining != null ? `${cardName} · ${formatMoney(remaining)} outstanding` : cardName
        }
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: markPaid.isPending,
        }}
        primary={{ label: 'Mark paid', onSelect: submit, loading: markPaid.isPending }}
      >
        <DialogBody>
          <SegmentedControl
            fullWidth
            aria-label="Payment type"
            options={[...MODES]}
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
          />
          {mode === 'part' ? (
            <AmountField
              label="Amount paid"
              prefix="₹"
              inputMode="decimal"
              value={amount}
              {...amountExpressionProps(amount, setAmount)}
              error={amountError ?? undefined}
            />
          ) : null}
          <DateField
            label="Paid on"
            today={today}
            maxDate={today}
            value={paidOn}
            onValueChange={(v) => setPaidOn(typeof v === 'string' ? v : '')}
            error={dateError ?? undefined}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
