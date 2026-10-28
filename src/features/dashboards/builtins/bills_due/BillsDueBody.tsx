'use client';

// bills_due: one row per open credit card, the card's name (with the due date once a bill is out) and one figure:
// the amount to pay, or the unbilled spend while the statement is expected (an overdue bill or a late statement
// says so in colour). Rows are read-only: marking paid and setting details live on the Inbox.

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Button, EmptyState, ListRow, StatusWord, Text } from '@/components/ds';
import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { type BillCardState, buildBillsWidgetModel, isHighlighted } from '@/features/bills/billCardState';
import { billCardLabel } from '@/features/bills/bills.helpers';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { useBills } from '@/lib/query/hooks/useBills';
import { formatMoney } from '@/lib/utils';

import { BuiltinError } from '../BuiltinParts';
import { stringParam } from '../subtitles';
import type { BuiltinBodyProps } from '../types';
import { BillsDueSkeleton } from './BillsDueSkeleton';

/** The one word beside the figure: unbilled while the statement is expected (warning when it is late), overdue when the bill is. */
function statusWord(state: BillCardState): React.ReactNode {
  if (state.phase === 'awaiting') {
    return state.statementLate ? <StatusWord tone="warning">Statement late</StatusWord> : 'unbilled';
  }
  return state.phase === 'overdue' ? <StatusWord tone="warning">Overdue</StatusWord> : null;
}

function BillRow({ state, highlighted }: { state: BillCardState; highlighted: boolean }) {
  const { bill, phase } = state;
  const awaiting = phase === 'awaiting';
  const headline = awaiting ? state.unbilled : state.toPay;
  return (
    <ListRow
      wrap
      highlighted={highlighted}
      data-testid="bill-row"
      data-phase={phase}
      data-statement-id={bill.statementId ?? undefined}
      data-account-id={bill.accountId}
      title={billCardLabel(bill)}
      subtitle={!awaiting && bill.paymentDueDate ? `Due ${formatDayMonth(bill.paymentDueDate)}` : undefined}
      trailing={
        <div className="flex items-baseline gap-space-6">
            <Text variant="caption" tone="ink-3" as="span" data-testid="bill-status">
              {statusWord(state)}
            </Text>
            <Text variant="body-strong" tone={phase === 'overdue' ? 'danger' : 'ink'} fraction="small" data-testid="bill-headline">
              {headline != null ? formatMoney(headline) : '—'}
            </Text>
        </div>
      }
    />
  );
}

export function BillsDueBody({ params, className }: BuiltinBodyProps) {
  const router = useRouter();
  const accountId = stringParam(params, 'accountId');
  const { data: bills = [], isLoading, error, refetch } = useBills(undefined, { accountId });
  const searchParams = useSearchParams();
  const highlight = { statementId: searchParams?.get('bill') ?? null, accountId: searchParams?.get('card') ?? null };
  const [showSettled, setShowSettled] = React.useState(false);

  const today = todayInAppZone();
  const model = React.useMemo(() => buildBillsWidgetModel(bills, today), [bills, today]);
  const highlightedAccountId = bills.find((b) => isHighlighted(b, highlight))?.accountId ?? null;

  const listRef = React.useRef<HTMLDivElement>(null);
  const settledHasHighlight = model.nothingPending.some((s) => s.bill.accountId === highlightedAccountId);
  React.useEffect(() => {
    if (settledHasHighlight) setShowSettled(true);
  }, [settledHasHighlight]);
  React.useEffect(() => {
    if (!highlightedAccountId) return;
    // Wait a frame so an auto-expanded "Nothing pending" group has rendered its rows.
    const id = requestAnimationFrame(() => {
      listRef.current?.querySelector(`[data-account-id="${highlightedAccountId}"]`)?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(id);
  }, [highlightedAccountId, bills.length]);

  let body: React.ReactNode;
  if (isLoading) {
    body = <BillsDueSkeleton />;
  } else if (error) {
    body = <BuiltinError message={getErrorMessage(error, 'request failed')} action={{ label: 'Retry', onSelect: () => void refetch() }} />;
  } else if (bills.length === 0) {
    body = accountId ? (
      <EmptyState compact title="No current bill for this card" />
    ) : (
      <EmptyState
        compact
        title="No credit cards yet"
        description="Add a credit card to track its bills here."
        action={{ label: 'Go to accounts', onSelect: () => router.push(appHref('/accounts')), variant: 'link' }}
      />
    );
  } else {
    const n = model.nothingPending.length;
    body = (
      <div ref={listRef}>
        <Text variant="caption" tone="ink-3" as="p" className="px-space-16 pb-space-8" data-testid="bills-widget-totals">
          To pay{' '}
          <Text as="span" variant="label" tone="ink" fraction="small" className="font-bold">
            {formatMoney(model.toPayTotal)}
          </Text>{' '}
          · Unbilled{' '}
          <Text as="span" variant="label" tone="ink" fraction="small" className="font-bold">
            {formatMoney(model.unbilledTotal)}
          </Text>
        </Text>
        {model.rows.map((s) => (
          <BillRow key={s.bill.accountId} state={s} highlighted={s.bill.accountId === highlightedAccountId} />
        ))}
        {n > 0 ? (
          <div data-testid="bills-nothing-pending">
            <Text variant="caption" as="p" className="px-space-16 py-space-8">
              <Button variant="link" aria-expanded={showSettled} onClick={() => setShowSettled((v) => !v)}>
                Nothing pending · {n} {n === 1 ? 'card' : 'cards'}
              </Button>
            </Text>
            {showSettled
              ? model.nothingPending.map((s) => (
                  <BillRow key={s.bill.accountId} state={s} highlighted={s.bill.accountId === highlightedAccountId} />
                ))
              : null}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className={className} data-testid="bills-due-widget">
      {body}
    </div>
  );
}
