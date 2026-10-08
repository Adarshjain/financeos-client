'use client';

import React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CardBillResponse, MarkBillPaidRequest } from '@/lib/api/types';
import { formatNullableMoney, sanitizeDecimalInput, toCalendarDate } from '@/lib/utils';

import { billCardLabel } from './bills.helpers';

interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: CardBillResponse | null;
  submitting: boolean;
  onSubmit: (body: MarkBillPaidRequest) => void | Promise<void>;
  /** Prefill from a "possible payment" the user is confirming. */
  prefill?: { amount: number; paidOn: string } | null;
}

/**
 * "Mark as paid": in full by default, or a partial amount. The date defaults to today and can
 * never be in the future (the server rejects it too).
 */
export function MarkPaidDialog({ open, onOpenChange, bill, submitting, onSubmit, prefill }: MarkPaidDialogProps) {
  const today = toCalendarDate(new Date());
  const remaining = bill?.remainingAmount ?? bill?.totalAmountDue ?? null;
  const [inFull, setInFull] = React.useState(true);
  const [amount, setAmount] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(today);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (prefill) {
      const coversRemaining = remaining != null && prefill.amount >= remaining;
      setInFull(coversRemaining);
      setAmount(coversRemaining ? '' : String(prefill.amount));
      setPaidOn(prefill.paidOn || today);
    } else {
      setInFull(true);
      setAmount('');
      setPaidOn(today);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill?.amount, prefill?.paidOn]);

  const submit = async () => {
    const body: MarkBillPaidRequest = {};
    if (!inFull) {
      const parsed = Number(amount);
      if (!amount || !Number.isFinite(parsed) || parsed <= 0) {
        setError('Enter the amount you paid');
        return;
      }
      body.amount = parsed;
    }
    if (paidOn) {
      if (paidOn > today) {
        setError('The paid date cannot be in the future');
        return;
      }
      body.paidOn = paidOn;
    }
    setError(null);
    await onSubmit(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Mark bill as paid</DialogTitle>
          {bill && (
            <DialogDescription>
              {billCardLabel(bill)} · {formatNullableMoney(remaining)} outstanding
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-3 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <Checkbox checked={inFull} onCheckedChange={(v) => setInFull(v === true)} aria-label="Paid in full" />
            Paid in full
          </label>
          {!inFull && (
            <div className="space-y-1">
              <Label htmlFor="mark-paid-amount">Amount paid (₹)</Label>
              <Input
                id="mark-paid-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value))}
                placeholder="0.00"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="mark-paid-on">Paid on</Label>
            <DateInput id="mark-paid-on" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} max={today} />
          </div>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </DialogBody>
        <DialogFooter
          secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false), disabled: submitting }}
          primaryAction={{ label: submitting ? 'Saving…' : 'Mark as paid', onClick: submit, disabled: submitting || !bill }}
        />
      </DialogContent>
    </Dialog>
  );
}
