'use client';

import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { billCardLabel } from '@/features/bills/billsModel';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';
import { StatementDetailsDialog } from '@/features/bills/StatementDetailsDialog';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useBill } from '@/lib/query/hooks/useBills';

import type { PendingBillAction } from './inboxBillActions';

interface InboxBillHostProps {
  pending: PendingBillAction | null;
  onClose: () => void;
}

/**
 * Hosts the Mark paid and Set statement details dialogs for inbox rows. The bill is loaded by
 * statement id first, so the dialogs open against its real figures.
 */
export function InboxBillHost({ pending, onClose }: InboxBillHostProps) {
  const { data: bill, error } = useBill(pending?.statementId, pending !== null);
  const ready = pending !== null && bill != null && bill.statementId === pending.statementId;

  React.useEffect(() => {
    if (pending && error) {
      showToast(getErrorMessage(error, "Couldn't load the bill. Try again."), { tone: 'danger' });
      onClose();
    }
  }, [pending, error, onClose]);

  const statementId = pending?.statementId ?? '';
  const cardLabel = ready && bill ? billCardLabel(bill) : '';

  return (
    <>
      <MarkPaidDialog
        open={ready && pending?.type === 'mark_paid'}
        onOpenChange={(open) => !open && onClose()}
        statementId={statementId}
        cardName={cardLabel}
        remaining={ready && bill ? (bill.remainingAmount ?? null) : null}
      />
      <StatementDetailsDialog
        open={ready && pending?.type === 'set_details'}
        onOpenChange={(open) => !open && onClose()}
        statementId={statementId}
        cardLabel={cardLabel}
        statementDate={ready && bill ? (bill.periodEnd ?? null) : null}
        totalDue={ready && bill ? (bill.totalAmountDue ?? null) : null}
        minimumDue={ready && bill ? (bill.minimumAmountDue ?? null) : null}
        dueDate={ready && bill ? (bill.paymentDueDate ?? null) : null}
      />
    </>
  );
}
