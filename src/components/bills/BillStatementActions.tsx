'use client';

import { CheckCircle2, Undo2 } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { MarkBillPaidRequest } from '@/lib/api/types';
import { useBill, useBillMutations } from '@/lib/query/hooks/useBills';
import { formatDate, formatNullableMoney } from '@/lib/utils';

import { BillStatusBadge } from './BillStatusBadge';
import { MarkPaidDialog } from './MarkPaidDialog';

interface BillStatementActionsProps {
  statementId: string | null | undefined;
}

/**
 * The bill status + "Mark as paid" / "Undo" for the card cycle summary inside the statements
 * dialog. Reads the same bill the dashboard card shows.
 */
export function BillStatementActions({ statementId }: BillStatementActionsProps) {
  const { data: bill } = useBill(statementId);
  const { markPaid, unmarkPaid } = useBillMutations();
  const [open, setOpen] = React.useState(false);

  if (!bill || typeof bill !== 'object' || !('status' in bill)) {
    return null;
  }
  const billStatementId = bill.statementId;
  if (!billStatementId) {
    return null;
  }
  const settled = bill.status === 'PAID' || bill.status === 'NO_DUE' || bill.status === 'AWAITING_STATEMENT';

  const submit = async (body: MarkBillPaidRequest) => {
    try {
      await markPaid.mutateAsync({ statementId: billStatementId, body });
      setOpen(false);
      toast.success('Bill marked as paid');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not mark the bill as paid'));
    }
  };

  const undo = async () => {
    try {
      await unmarkPaid.mutateAsync(billStatementId);
      toast.success('Payment mark removed');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not undo the payment mark'));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="bill-statement-actions">
      <BillStatusBadge status={bill.status} daysUntilDue={bill.daysUntilDue} />
      {bill.status === 'PARTIAL' && (
        <span className="text-2xs text-slate-500">{formatNullableMoney(bill.paidAmount)} paid</span>
      )}
      {bill.status === 'PAID' && bill.paidMarkedOn && (
        <span className="text-2xs text-slate-500">on {formatDate(bill.paidMarkedOn)}</span>
      )}
      {!settled && bill.status !== 'DUE_UNKNOWN' && (
        <Button size="micro" variant="primary" disabled={markPaid.isPending} onClick={() => setOpen(true)}>
          <CheckCircle2 className="h-3 w-3" />
          Mark as paid
        </Button>
      )}
      {(bill.status === 'PAID' || bill.status === 'PARTIAL') && bill.paidSource === 'MANUAL' && (
        <Button size="micro" variant="ghost" disabled={unmarkPaid.isPending} onClick={undo}>
          <Undo2 className="h-3 w-3" />
          Undo
        </Button>
      )}
      <MarkPaidDialog open={open} onOpenChange={setOpen} bill={bill} submitting={markPaid.isPending} onSubmit={submit} />
    </div>
  );
}
