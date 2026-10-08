'use client';

import { CalendarClock, CheckCircle2, CreditCard, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { BillPossiblePayment, CardBillResponse } from '@/lib/api/types';
import { cn, formatDate, formatNullableMoney } from '@/lib/utils';

import { billCardLabel, billDueText } from './bills.helpers';
import { BillStatusBadge } from './BillStatusBadge';

interface BillRowProps {
  bill: CardBillResponse;
  highlighted?: boolean;
  busy: boolean;
  onMarkPaid: (bill: CardBillResponse) => void;
  onUnmarkPaid: (bill: CardBillResponse) => void;
  onSetDetails: (bill: CardBillResponse) => void;
  onConfirmPayment: (bill: CardBillResponse, payment: BillPossiblePayment) => void;
}

/** One card's bill on the dashboard: label, status, amount, due phrase and the actions that apply. */
export function BillRow({ bill, highlighted, busy, onMarkPaid, onUnmarkPaid, onSetDetails, onConfirmPayment }: BillRowProps) {
  const settled = bill.status === 'PAID' || bill.status === 'NO_DUE';
  const canUnmark = bill.paidSource === 'MANUAL';
  const amount = settled ? bill.totalAmountDue : (bill.remainingAmount ?? bill.totalAmountDue);
  const possible = bill.possiblePayments ?? [];

  return (
    <li
      data-testid="bill-row"
      data-statement-id={bill.statementId}
      className={cn(
        'px-4 py-3 space-y-2 transition-colors',
        highlighted && 'bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{billCardLabel(bill)}</span>
            <BillStatusBadge status={bill.status} daysUntilDue={bill.daysUntilDue} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {billDueText(bill)}
            {bill.paymentDueDate && bill.status !== 'DUE_UNKNOWN' ? ` · ${formatDate(bill.paymentDueDate)}` : ''}
            {bill.status === 'PARTIAL' || (bill.status === 'OVERDUE' && (bill.paidAmount ?? 0) > 0)
              ? ` · ${formatNullableMoney(bill.paidAmount)} paid`
              : ''}
            {bill.status === 'PAID' && bill.paidMarkedOn ? ` · ${formatDate(bill.paidMarkedOn)}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('text-base font-extrabold tabular-nums', settled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white')}>
            {formatNullableMoney(amount)}
          </div>
          {!settled && bill.minimumAmountDue != null && (
            <div className="text-2xs text-slate-400 tabular-nums">min {formatNullableMoney(bill.minimumAmountDue)}</div>
          )}
        </div>
      </div>

      {possible.length > 0 && (
        <ul className="space-y-1" data-testid="possible-payments">
          {possible.map((p) => (
            <li
              key={p.transactionId}
              className="flex items-center justify-between gap-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300"
            >
              <span className="truncate">
                Looks like a payment: {formatNullableMoney(p.amount)} on {formatDate(p.date)}
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
            Set due date
          </Button>
        )}
        {!settled && (
          <Button size="xs" variant="primary" disabled={busy} onClick={() => onMarkPaid(bill)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark as paid
          </Button>
        )}
        {bill.status === 'PARTIAL' && canUnmark && (
          <Button size="xs" variant="ghost" disabled={busy} onClick={() => onUnmarkPaid(bill)}>
            <Undo2 className="h-3.5 w-3.5" />
            Clear partial
          </Button>
        )}
        {bill.status === 'PAID' && canUnmark && (
          <Button size="xs" variant="ghost" disabled={busy} onClick={() => onUnmarkPaid(bill)}>
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </Button>
        )}
      </div>
    </li>
  );
}
