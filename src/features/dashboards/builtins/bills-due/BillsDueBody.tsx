'use client';

// bills_due: one row per open credit card, the card's name (with the due date once a bill is out) and one figure:
// the amount to pay, or the unbilled spend while the statement is expected (an overdue bill or a late statement
// says so in colour). Rows are read-only: marking paid and setting details live on the Inbox.

import { useSearchParams } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { type BillCardState, buildBillsWidgetModel, isHighlighted } from '@/features/bills/billCardStateModel';
import { billCardLabel } from '@/features/bills/billsModel';
import { BuiltinError } from '@/features/dashboards/builtins/BuiltinParts';
import { stringParam } from '@/features/dashboards/builtins/subtitlesModel';
import type { BuiltinBodyProps } from '@/features/dashboards/builtins/types';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import { useBills } from '@/lib/query/hooks/useBills';

import { BillsDueSkeleton } from './BillsDueSkeleton';

/** The one word beside the figure: unbilled while the statement is expected (warning when it is late), overdue when the bill is. */
function statusWord(state: BillCardState): React.ReactNode {
  if (state.phase === 'awaiting') {
    return state.statementLate ? <StatusWord tone="warning">Statement late</StatusWord> : 'unbilled';
  }
  return state.phase === 'overdue' ? <StatusWord tone="danger">Overdue</StatusWord> : null;
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
      subtitle={!awaiting && bill.paymentDueDate ? `Due ${formatDate(bill.paymentDueDate, 'list')}` : undefined}
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
    body = <BuiltinError message={getErrorMessage(error, "Couldn't load your bills.")} action={{ label: 'Retry', onSelect: () => void refetch() }} />;
  } else if (bills.length === 0) {
    body = accountId ? (
      <EmptyState compact description="No current bill for this card" />
    ) : (
      <EmptyState
        compact
        description="Add a credit card to track its bills here."
        action={{ label: 'Go to accounts', href: appHref('/accounts'), variant: 'link' }}
      />
    );
  } else {
    const n = model.nothingPending.length;
    body = (
      <div ref={listRef}>
        <Text variant="caption" tone="ink-3" as="p" className="px-space-16 pb-space-8" data-testid="bills-widget-totals">
          To pay{' '}
          <Text as="span" variant="label" tone="ink" fraction="small">
            {formatMoney(model.toPayTotal)}
          </Text>{' '}
          · Unbilled{' '}
          <Text as="span" variant="label" tone="ink" fraction="small">
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
                Nothing pending · {formatCount(n, ['card', 'cards'])}
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
