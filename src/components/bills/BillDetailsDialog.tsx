'use client';

import React from 'react';

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
import type { CardBillResponse, UpdateBillDetailsRequest } from '@/lib/api/types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { billCardLabel } from './bills.helpers';

interface BillDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: CardBillResponse | null;
  submitting: boolean;
  onSubmit: (body: UpdateBillDetailsRequest) => void | Promise<void>;
}

/** Fill in what the parser missed: due date, total due, minimum due. At least one is required. */
export function BillDetailsDialog({ open, onOpenChange, bill, submitting, onSubmit }: BillDetailsDialogProps) {
  const [dueDate, setDueDate] = React.useState('');
  const [total, setTotal] = React.useState('');
  const [minimum, setMinimum] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDueDate(bill?.paymentDueDate ?? '');
    setTotal(bill?.totalAmountDue != null ? String(bill.totalAmountDue) : '');
    setMinimum(bill?.minimumAmountDue != null ? String(bill.minimumAmountDue) : '');
    setError(null);
  }, [open, bill?.paymentDueDate, bill?.totalAmountDue, bill?.minimumAmountDue]);

  const submit = async () => {
    const body: UpdateBillDetailsRequest = {};
    if (dueDate && dueDate !== bill?.paymentDueDate) body.paymentDueDate = dueDate;
    if (total !== '' && Number(total) !== bill?.totalAmountDue) {
      if (!Number.isFinite(Number(total)) || Number(total) < 0) {
        setError('Total due must be zero or more');
        return;
      }
      body.totalAmountDue = Number(total);
    }
    if (minimum !== '' && Number(minimum) !== bill?.minimumAmountDue) {
      if (!Number.isFinite(Number(minimum)) || Number(minimum) < 0) {
        setError('Minimum due must be zero or more');
        return;
      }
      body.minimumAmountDue = Number(minimum);
    }
    if (Object.keys(body).length === 0) {
      setError('Change at least one of the fields');
      return;
    }
    setError(null);
    await onSubmit(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Statement details</DialogTitle>
          {bill && (
            <DialogDescription>
              {billCardLabel(bill)} · fill in what the statement parser could not read.
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="bill-due-date">Payment due date</Label>
            <DateInput id="bill-due-date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bill-total">Total amount due (₹)</Label>
            <Input
              id="bill-total"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(sanitizeDecimalInput(e.target.value))}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bill-minimum">Minimum amount due (₹)</Label>
            <Input
              id="bill-minimum"
              inputMode="decimal"
              value={minimum}
              onChange={(e) => setMinimum(sanitizeDecimalInput(e.target.value))}
              placeholder="0.00"
            />
          </div>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </DialogBody>
        <DialogFooter
          secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false), disabled: submitting }}
          primaryAction={{ label: submitting ? 'Saving…' : 'Save', onClick: submit, disabled: submitting || !bill }}
        />
      </DialogContent>
    </Dialog>
  );
}
