'use client';

import { CheckCircle2, ChevronDown } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';

import { canUndoPaid, UndoPaidButton } from './BillCardRow';
import type { BillCardState } from './billCardState';
import { billCardLabel } from './bills.helpers';
import type { BillRowActions } from './useBillsWidgetActions';

interface NothingPendingGroupProps {
  states: BillCardState[];
  /** Account id of the highlighted card when it sits inside this group: auto-expands. */
  highlightedAccountId: string | null;
  actions: BillRowActions;
}

/** One quiet line under a settled card: when it was paid, or when the next statement lands. */
function quietLine(state: BillCardState): string {
  const { bill } = state;
  if (bill.status === 'PAID' && bill.paidMarkedOn) return `Paid on ${formatDate(bill.paidMarkedOn)}`;
  const expected = bill.nextStatementExpectedOn;
  if (expected) return `${state.statementLate ? 'Statement due since' : 'Statement expected'} ${formatDate(expected)}`;
  return 'No spend since the last statement';
}

/** Cards with nothing to pay and nothing unbilled, collapsed into one expandable row. */
export function NothingPendingGroup({ states, highlightedAccountId, actions }: NothingPendingGroupProps) {
  const containsHighlight = highlightedAccountId != null && states.some((s) => s.bill.accountId === highlightedAccountId);
  const [open, setOpen] = React.useState(containsHighlight);

  React.useEffect(() => {
    if (containsHighlight) setOpen(true);
  }, [containsHighlight]);

  if (states.length === 0) return null;
  const n = states.length;

  return (
    <li data-testid="bills-nothing-pending">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between rounded-none px-4"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Nothing pending · {n} {n === 1 ? 'card' : 'cards'}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          {states.map((s) => (
            <li
              key={s.bill.accountId}
              data-testid="bill-row"
              data-phase="nothing-pending"
              data-statement-id={s.bill.statementId ?? undefined}
              data-account-id={s.bill.accountId}
              className={cn(
                'flex items-center justify-between gap-3 px-4 py-2',
                s.bill.accountId === highlightedAccountId && 'ring-2 ring-inset ring-emerald-500/60',
              )}
            >
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{billCardLabel(s.bill)}</span>
              <span
                className={cn(
                  'text-2xs shrink-0',
                  s.statementLate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500',
                )}
              >
                {quietLine(s)}
              </span>
              {canUndoPaid(s.bill) && <UndoPaidButton bill={s.bill} actions={actions} />}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
