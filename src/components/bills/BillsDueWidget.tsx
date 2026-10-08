'use client';

import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { useBills } from '@/lib/query/hooks/useBills';
import { cn, formatMoney } from '@/lib/utils';

import { BillCardRow } from './BillCardRow';
import { buildBillsWidgetModel, isHighlighted } from './billCardState';
import { BillDetailsDialog } from './BillDetailsDialog';
import { MarkPaidDialog } from './MarkPaidDialog';
import { NothingPendingGroup } from './NothingPendingGroup';
import { useBillsWidgetActions } from './useBillsWidgetActions';

export interface BillsDueWidgetProps {
  /** Only this card's bill; all open credit cards when absent. */
  accountId?: string | null;
  /** Row to ring and scroll to; falls back to the `?bill=` search param. */
  highlightStatementId?: string | null;
  className?: string;
}

/**
 * The Bills due widget BODY (the host supplies the frame and title): one row per open credit
 * card, moving from "unbilled spend, statement expected" to "amount to pay, due in N days" to
 * overdue. Fills its container and scrolls internally; owns its dialogs and actions.
 */
export function BillsDueWidget({ accountId, highlightStatementId, className }: BillsDueWidgetProps) {
  const { data: bills = [], isLoading, error } = useBills(undefined, { accountId });
  const searchParams = useSearchParams();
  const highlight = {
    statementId: highlightStatementId ?? searchParams?.get('bill') ?? null,
    accountId: searchParams?.get('card') ?? null,
  };
  const { rowActions, markPaidDialog, detailsDialog } = useBillsWidgetActions();

  const today = todayInAppZone();
  const model = React.useMemo(() => buildBillsWidgetModel(bills, today), [bills, today]);
  const highlightedAccountId = bills.find((b) => isHighlighted(b, highlight))?.accountId ?? null;

  const listRef = React.useRef<HTMLUListElement>(null);
  React.useEffect(() => {
    if (!highlightedAccountId) return;
    // Wait a frame so an auto-expanded "Nothing pending" group has rendered its rows.
    const id = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-account-id="${highlightedAccountId}"]`);
      el?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(id);
  }, [highlightedAccountId, bills.length]);

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-2 p-4" data-testid="bills-widget-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (error) {
    body = (
      <p className="px-4 py-4 text-xs text-rose-600 dark:text-rose-400">
        Couldn&apos;t load bills: {getErrorMessage(error, 'request failed')}
      </p>
    );
  } else if (bills.length === 0) {
    body = accountId ? (
      <EmptyState compact icon={CreditCard} title="No current bill for this card" className="m-4" />
    ) : (
      <EmptyState
        compact
        icon={CreditCard}
        title="No credit cards yet"
        description="Add a credit card to track its bills here."
        className="m-4"
        action={
          <Button asChild variant="link" size="xs">
            <Link href="/accounts">Go to accounts</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        <p
          className="shrink-0 px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800"
          data-testid="bills-widget-totals"
        >
          To pay <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatMoney(model.toPayTotal)}</span>
          {' · '}
          Unbilled <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatMoney(model.unbilledTotal)}</span>
        </p>
        <ul ref={listRef} className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {model.rows.map((s) => (
            <BillCardRow
              key={s.bill.accountId}
              state={s}
              highlighted={s.bill.accountId === highlightedAccountId}
              actions={rowActions}
            />
          ))}
          <NothingPendingGroup states={model.nothingPending} highlightedAccountId={highlightedAccountId} actions={rowActions} />
        </ul>
      </>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)} data-testid="bills-due-widget">
      {body}
      <MarkPaidDialog {...markPaidDialog} />
      <BillDetailsDialog {...detailsDialog} />
    </div>
  );
}
