'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';

import { BillDetailsDialog } from '@/components/bills/BillDetailsDialog';
import { MarkPaidDialog } from '@/components/bills/MarkPaidDialog';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type {
  InboxActionResponse,
  InboxItemResponse,
  MarkBillPaidRequest,
  UpdateBillDetailsRequest,
} from '@/lib/api/types';
import { useBill, useBillMutations } from '@/lib/query/hooks/useBills';
import { keys } from '@/lib/query/keys';

import { type BillActionType, isBillAction } from './inbox.helpers';

export interface PendingBillAction {
  type: BillActionType;
  statementId: string;
  /** confirm_payment: the matched payment to prefill. */
  prefill?: { amount: number; paidOn: string } | null;
}

/**
 * The dialog a row's bill action opens (mark paid, confirm payment prefilled with the matched
 * payment, set details), or null when the action is not a bill action or names no statement.
 */
export function toPendingBillAction(
  item: InboxItemResponse,
  action: InboxActionResponse,
): PendingBillAction | null {
  const statementId = action.payload?.statementId ?? item.refs.statementId;
  if (!statementId || !isBillAction(action.type)) return null;
  const payload = action.payload;
  const prefill =
    action.type === 'confirm_payment' && payload?.amount != null
      ? { amount: payload.amount, paidOn: payload.date ?? '' }
      : null;
  return { type: action.type, statementId, prefill };
}

interface InboxBillDialogsProps {
  pending: PendingBillAction | null;
  onClose: () => void;
}

/**
 * Hosts the shared bill dialogs for inbox rows: mark paid (optionally prefilled from a possible
 * payment) and set details. The bill is loaded by statement id when a dialog opens.
 */
export function InboxBillDialogs({ pending, onClose }: InboxBillDialogsProps) {
  const qc = useQueryClient();
  const { data: bill, error } = useBill(pending?.statementId, pending !== null);
  const { markPaid, updateDetails } = useBillMutations();
  const isMarkPaid = pending?.type === 'mark_paid' || pending?.type === 'confirm_payment';
  // The dialogs open once the bill is in, so "paid in full" vs a partial prefill is decided
  // against the real outstanding amount rather than a still-loading bill.
  const ready = pending !== null && bill != null && bill.statementId === pending.statementId;

  React.useEffect(() => {
    if (pending && error) {
      toast.error(getErrorMessage(error, 'Could not load the bill'));
      onClose();
    }
  }, [pending, error, onClose]);

  const refreshInbox = () => qc.invalidateQueries({ queryKey: keys.inbox.all });

  const submitMarkPaid = async (body: MarkBillPaidRequest) => {
    if (!pending) return;
    try {
      const updated = await markPaid.mutateAsync({ statementId: pending.statementId, body });
      onClose();
      toast.success(updated.status === 'PAID' ? 'Bill marked as paid' : 'Partial payment recorded');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not mark the bill as paid'));
    } finally {
      void refreshInbox();
    }
  };

  const submitDetails = async (body: UpdateBillDetailsRequest) => {
    if (!pending) return;
    try {
      await updateDetails.mutateAsync({ statementId: pending.statementId, body });
      onClose();
      toast.success('Statement details saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save the statement details'));
    } finally {
      void refreshInbox();
    }
  };

  return (
    <>
      <MarkPaidDialog
        open={ready && isMarkPaid}
        onOpenChange={(open) => !open && onClose()}
        bill={isMarkPaid ? (bill ?? null) : null}
        submitting={markPaid.isPending}
        onSubmit={submitMarkPaid}
        prefill={pending?.type === 'confirm_payment' ? pending.prefill : null}
      />
      <BillDetailsDialog
        open={ready && pending?.type === 'set_details'}
        onOpenChange={(open) => !open && onClose()}
        bill={pending?.type === 'set_details' ? (bill ?? null) : null}
        submitting={updateDetails.isPending}
        onSubmit={submitDetails}
      />
    </>
  );
}
