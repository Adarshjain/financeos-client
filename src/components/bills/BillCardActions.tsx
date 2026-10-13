'use client';

import { CalendarClock, CheckCircle2, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CardBillResponse } from '@/lib/api/types';

import type { BillRowActions } from './useBillsWidgetActions';

interface BillCardActionsProps {
  bill: CardBillResponse;
  actions: BillRowActions;
}

/** Mark paid / Undo / Set details for a statement that arrived. */
export function BillCardActions({ bill, actions }: BillCardActionsProps) {
  if (!bill.statementId) return null;
  const { busy, onMarkPaid, onUnmarkPaid, onSetDetails } = actions;
  const canUndo = bill.paidSource === 'MANUAL' && (bill.paidAmount ?? 0) > 0;

  return (
    <div className="flex flex-wrap gap-2">
      {bill.status === 'DUE_UNKNOWN' && (
        <Button size="xs" variant="secondary" disabled={busy} onClick={() => onSetDetails(bill)}>
          <CalendarClock className="h-3.5 w-3.5" />
          Set details
        </Button>
      )}
      <Button size="xs" variant="primary" disabled={busy} onClick={() => onMarkPaid(bill)}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Mark paid
      </Button>
      {canUndo && (
        <Button size="xs" variant="ghost" disabled={busy} onClick={() => onUnmarkPaid(bill)}>
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </Button>
      )}
    </div>
  );
}
