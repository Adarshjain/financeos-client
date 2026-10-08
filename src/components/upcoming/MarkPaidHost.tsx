'use client';

import { toast } from 'sonner';

import { MarkPaidDialog } from '@/components/bills/MarkPaidDialog';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { MarkBillPaidRequest } from '@/lib/api/types';
import { useBill, useBillMutations } from '@/lib/query/hooks/useBills';

/** Loads one statement's bill and hosts the shared Mark-paid dialog. */
export function MarkPaidHost({
  statementId,
  onClose,
}: {
  statementId: string | null;
  onClose: () => void;
}) {
  const { data: bill } = useBill(statementId, statementId != null);
  const { markPaid } = useBillMutations();

  const submit = async (body: MarkBillPaidRequest) => {
    if (!statementId) return;
    try {
      await markPaid.mutateAsync({ statementId, body });
      toast.success('Bill marked as paid');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not mark the bill as paid'));
    }
  };

  return (
    <MarkPaidDialog
      open={statementId != null && Boolean(bill)}
      onOpenChange={(o) => !o && onClose()}
      bill={bill ?? null}
      submitting={markPaid.isPending}
      onSubmit={submit}
    />
  );
}
