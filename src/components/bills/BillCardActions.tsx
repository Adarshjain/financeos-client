'use client';

import { CalendarClock, CheckCircle2, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CardBillResponse } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/utils';

import type { BillRowActions } from './useBillsWidgetActions';

interface BillCardActionsProps {
  bill: CardBillResponse;
  actions: BillRowActions;
}

/** Possible payments to confirm plus Mark paid / Undo / Set details for a statement that arrived. */
export function BillCardActions({ bill, actions }: BillCardActionsProps) {
  if (!bill.statementId) return null;
  const { busy, onMarkPaid, onUnmarkPaid, onSetDetails, onConfirmPayment } = actions;
  const possible = bill.possiblePayments ?? [];
  const canUndo = bill.paidSource === 'MANUAL' && (bill.paidAmount ?? 0) > 0;

  return (
    <>
      {possible.length > 0 && (
        <ul className="space-y-1" data-testid="possible-payments">
          {possible.map((p) => (
            <li
              key={p.transactionId}
              className="flex items-center justify-between gap-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300"
            >
              <span className="truncate">
                Looks like a payment: {formatMoney(p.amount)} on {formatDate(p.date)}
              </span>
              <Button size="micro" variant="outline" disabled={busy} onClick={() => onConfirmPayment(bill, p)}>
                Confirm
              </Button>
            </li>
          ))}
        </ul>
      )}
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
    </>
  );
}
