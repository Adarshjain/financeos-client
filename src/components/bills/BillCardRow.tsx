'use client';

import { CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CardBillResponse } from '@/lib/api/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { BillCardActions } from './BillCardActions';
import type { BillCardState } from './billCardState';
import { billCardLabel, billDueText } from './bills.helpers';
import { BillStatusBadge } from './BillStatusBadge';
import type { BillRowActions } from './useBillsWidgetActions';

interface BillCardRowProps {
  state: BillCardState;
  highlighted?: boolean;
  actions: BillRowActions;
}

export function canUndoPaid(bill: CardBillResponse): boolean {
  return bill.status === 'PAID' && bill.paidSource === 'MANUAL' && !!bill.statementId;
}

export function UndoPaidButton({ bill, actions }: { bill: CardBillResponse; actions: BillRowActions }) {
  return (
    <Button variant="ghost" size="xs" disabled={actions.busy} onClick={() => actions.onUnmarkPaid(bill)}>
      Undo paid
    </Button>
  );
}

/** "Statement expected 05/10/2026", or amber "Statement due since …" once the date has passed. */
function ExpectedLine({ state }: { state: BillCardState }) {
  const expected = state.bill.nextStatementExpectedOn;
  if (!expected) return null;
  return (
    <p
      className={cn(
        'text-xs',
        state.statementLate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400',
      )}
      data-testid="bill-expected"
    >
      {state.statementLate ? 'Statement due since' : 'Statement expected'} {formatDate(expected)}
    </p>
  );
}

/** Due phrase, partial-payment progress and the spend that will land on the next statement. */
function ArrivedLines({ state }: { state: BillCardState }) {
  const { bill, phase, unbilled } = state;
  const paid = bill.paidAmount ?? 0;
  const showDate = bill.paymentDueDate && bill.status !== 'DUE_UNKNOWN';
  return (
    <>
      <p
        className={cn(
          'text-xs',
          phase === 'overdue' ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
        )}
      >
        {billDueText(bill)}
        {showDate ? ` · ${formatDate(bill.paymentDueDate)}` : ''}
      </p>
      {(bill.status === 'PARTIAL' || paid > 0) && bill.totalAmountDue != null && (
        <p className="text-xs text-slate-500 dark:text-slate-400" data-testid="bill-partial">
          Paid {formatMoney(paid)} of {formatMoney(bill.totalAmountDue)}
        </p>
      )}
      {unbilled != null && unbilled > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500" data-testid="bill-unbilled">
          {formatMoney(unbilled)} spent since this statement
        </p>
      )}
    </>
  );
}

/**
 * One credit card in the Bills due widget. Awaiting cards headline their unbilled spend and when
 * the next statement is expected; arrived and overdue cards headline what is left to pay.
 */
export function BillCardRow({ state, highlighted, actions }: BillCardRowProps) {
  const { bill, phase } = state;
  const awaiting = phase === 'awaiting';
  const overdue = phase === 'overdue';
  const headline = awaiting ? state.unbilled : state.toPay;

  return (
    <li
      data-testid="bill-row"
      data-phase={phase}
      data-statement-id={bill.statementId ?? undefined}
      data-account-id={bill.accountId}
      className={cn(
        'px-4 py-3 space-y-2 transition-colors',
        overdue && 'bg-rose-50/60 dark:bg-rose-950/20 border-l-2 border-rose-500',
        highlighted && 'ring-2 ring-inset ring-emerald-500/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className={cn('h-4 w-4 shrink-0', overdue ? 'text-rose-500' : 'text-slate-400')} />
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{billCardLabel(bill)}</span>
            <BillStatusBadge status={bill.status} daysUntilDue={bill.daysUntilDue} />
          </div>
          {awaiting ? <ExpectedLine state={state} /> : <ArrivedLines state={state} />}
          {bill.status === 'PAID' && bill.paidMarkedOn && (
            <p className="text-2xs text-slate-400 dark:text-slate-500">Paid on {formatDate(bill.paidMarkedOn)}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div
            className={cn(
              'text-base font-extrabold tabular-nums',
              overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white',
            )}
            data-testid="bill-headline"
          >
            {headline != null ? formatMoney(headline) : '—'}
          </div>
          {awaiting ? (
            <div className="text-2xs text-slate-400">unbilled</div>
          ) : (
            bill.minimumAmountDue != null && (
              <div className="text-2xs text-slate-400 tabular-nums">Min {formatMoney(bill.minimumAmountDue)}</div>
            )
          )}
        </div>
      </div>

      {!awaiting && <BillCardActions bill={bill} actions={actions} />}
      {awaiting && canUndoPaid(bill) && <UndoPaidButton bill={bill} actions={actions} />}
    </li>
  );
}
