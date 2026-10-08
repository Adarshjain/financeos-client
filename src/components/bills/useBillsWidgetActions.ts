'use client';

import React from 'react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api/errorMessage';
import type { BillPossiblePayment, CardBillResponse, MarkBillPaidRequest, UpdateBillDetailsRequest } from '@/lib/api/types';
import { useBillMutations } from '@/lib/query/hooks/useBills';

export interface BillRowActions {
  busy: boolean;
  onMarkPaid: (bill: CardBillResponse) => void;
  onUnmarkPaid: (bill: CardBillResponse) => void;
  onSetDetails: (bill: CardBillResponse) => void;
  onConfirmPayment: (bill: CardBillResponse, payment: BillPossiblePayment) => void;
}

/**
 * Dialog targets and submit handlers for the Bills due widget. Every action needs a statement,
 * so rows without one (awaiting the next statement) are ignored defensively.
 */
export function useBillsWidgetActions() {
  const { markPaid, unmarkPaid, updateDetails } = useBillMutations();
  const [paidTarget, setPaidTarget] = React.useState<CardBillResponse | null>(null);
  const [paidPrefill, setPaidPrefill] = React.useState<{ amount: number; paidOn: string } | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<CardBillResponse | null>(null);

  const busy = markPaid.isPending || unmarkPaid.isPending || updateDetails.isPending;

  const rowActions: BillRowActions = {
    busy,
    onMarkPaid: (bill) => {
      if (!bill.statementId) return;
      setPaidPrefill(null);
      setPaidTarget(bill);
    },
    onConfirmPayment: (bill, payment) => {
      if (!bill.statementId) return;
      setPaidPrefill({ amount: payment.amount ?? 0, paidOn: payment.date ?? '' });
      setPaidTarget(bill);
    },
    onSetDetails: (bill) => {
      if (!bill.statementId) return;
      setDetailsTarget(bill);
    },
    onUnmarkPaid: async (bill) => {
      if (!bill.statementId) return;
      try {
        await unmarkPaid.mutateAsync(bill.statementId);
        toast.success('Payment mark removed');
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not undo the payment mark'));
      }
    },
  };

  const submitMarkPaid = async (body: MarkBillPaidRequest) => {
    const statementId = paidTarget?.statementId;
    if (!statementId) return;
    try {
      const bill = await markPaid.mutateAsync({ statementId, body });
      setPaidTarget(null);
      toast.success(bill.status === 'PAID' ? 'Bill marked as paid' : 'Partial payment recorded');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not mark the bill as paid'));
    }
  };

  const submitDetails = async (body: UpdateBillDetailsRequest) => {
    const statementId = detailsTarget?.statementId;
    if (!statementId) return;
    try {
      await updateDetails.mutateAsync({ statementId, body });
      setDetailsTarget(null);
      toast.success('Statement details saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save the statement details'));
    }
  };

  return {
    rowActions,
    markPaidDialog: {
      open: paidTarget !== null,
      onOpenChange: (open: boolean) => {
        if (!open) setPaidTarget(null);
      },
      bill: paidTarget,
      submitting: markPaid.isPending,
      onSubmit: submitMarkPaid,
      prefill: paidPrefill,
    },
    detailsDialog: {
      open: detailsTarget !== null,
      onOpenChange: (open: boolean) => {
        if (!open) setDetailsTarget(null);
      },
      bill: detailsTarget,
      submitting: updateDetails.isPending,
      onSubmit: submitDetails,
    },
  };
}
