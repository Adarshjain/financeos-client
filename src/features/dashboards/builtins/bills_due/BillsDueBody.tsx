'use client';

// bills_due: one row per open credit card, moving from "unbilled spend, statement expected" to "amount to
// pay, due in N days" to overdue. Mark paid and Set details open the same dialogs as the Inbox; Undo removes
// a manual payment mark.

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Button, EmptyState, formatDate, ListRow, showToast, StatusWord, Text } from '@/components/ds';
import { type BillCardState, buildBillsWidgetModel, isHighlighted } from '@/features/bills/billCardState';
import { billCardLabel, billDueText } from '@/features/bills/bills.helpers';
import type { PendingBillAction } from '@/features/inbox/inboxBillAction';
import { InboxBillHost } from '@/features/inbox/InboxBillHost';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { CardBillResponse } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { useBillMutations, useBills } from '@/lib/query/hooks/useBills';
import { formatMoney } from '@/lib/utils';

import { BuiltinError } from '../BuiltinParts';
import { stringParam } from '../subtitles';
import type { BuiltinBodyProps } from '../types';
import { BillsDueSkeleton } from './BillsDueSkeleton';

/** A manual payment mark on the statement can be taken back. */
export function canUndoPaid(bill: CardBillResponse): boolean {
  return bill.status === 'PAID' && bill.paidSource === 'MANUAL' && !!bill.statementId;
}

interface Actions {
  busy: boolean;
  onMarkPaid: (bill: CardBillResponse) => void;
  onSetDetails: (bill: CardBillResponse) => void;
  onUnmarkPaid: (bill: CardBillResponse) => void;
}

/** The context line under a card: statement date, due phrase, part-payment and unbilled spend. */
function contextLine(state: BillCardState): React.ReactNode {
  const { bill, phase, unbilled } = state;
  if (phase === 'awaiting') {
    const expected = bill.nextStatementExpectedOn;
    if (bill.status === 'PAID' && bill.paidMarkedOn) return `Paid on ${formatDate(bill.paidMarkedOn, 'list')}`;
    if (!expected) return 'No spend since the last statement';
    const text = `${state.statementLate ? 'Statement due since' : 'Statement expected'} ${formatDate(expected, 'list')}`;
    return state.statementLate ? <StatusWord tone="warning">{text}</StatusWord> : text;
  }
  const paid = bill.paidAmount ?? 0;
  const due = `${billDueText(bill)}${bill.paymentDueDate && bill.status !== 'DUE_UNKNOWN' ? ` · ${formatDate(bill.paymentDueDate, 'list')}` : ''}`;
  const parts: React.ReactNode[] = [phase === 'overdue' ? <StatusWord key="due" tone="warning">{due}</StatusWord> : due];
  if ((bill.status === 'PARTIAL' || paid > 0) && bill.totalAmountDue != null) {
    parts.push(`Paid ${formatMoney(paid)} of ${formatMoney(bill.totalAmountDue)}`);
  }
  if (unbilled != null && unbilled > 0) parts.push(`${formatMoney(unbilled)} spent since this statement`);
  return parts.map((p, i) => (
    <React.Fragment key={i}>
      {i > 0 ? ' · ' : null}
      {p}
    </React.Fragment>
  ));
}

function BillRow({ state, highlighted, actions }: { state: BillCardState; highlighted: boolean; actions: Actions }) {
  const { bill, phase } = state;
  const awaiting = phase === 'awaiting';
  const headline = awaiting ? state.unbilled : state.toPay;
  const canUndo = awaiting ? canUndoPaid(bill) : bill.paidSource === 'MANUAL' && (bill.paidAmount ?? 0) > 0;
  return (
    <ListRow
      wrap
      highlighted={highlighted}
      data-testid="bill-row"
      data-phase={phase}
      data-statement-id={bill.statementId ?? undefined}
      data-account-id={bill.accountId}
      title={billCardLabel(bill)}
      subtitle={contextLine(state)}
      trailing={
        <>
          <div className="flex flex-col items-end">
            <Text variant="body-strong" tone={phase === 'overdue' ? 'danger' : 'ink'} fraction="small" data-testid="bill-headline">
              {headline != null ? formatMoney(headline) : '—'}
            </Text>
            <Text variant="caption" tone="ink-3">
              {awaiting
                ? 'unbilled'
                : bill.minimumAmountDue != null
                  ? `Min ${formatMoney(bill.minimumAmountDue)}`
                  : null}
            </Text>
          </div>
          {!awaiting && bill.statementId && bill.status === 'DUE_UNKNOWN' ? (
            <Button variant="link" size="sm" disabled={actions.busy} onClick={() => actions.onSetDetails(bill)}>
              Set details
            </Button>
          ) : null}
          {!awaiting && bill.statementId ? (
            <Button
              variant={phase === 'overdue' ? 'primary' : 'secondary'}
              size="sm"
              disabled={actions.busy}
              onClick={() => actions.onMarkPaid(bill)}
            >
              Mark paid
            </Button>
          ) : null}
          {canUndo && bill.statementId ? (
            <Button variant="link" size="sm" disabled={actions.busy} onClick={() => actions.onUnmarkPaid(bill)}>
              Undo
            </Button>
          ) : null}
        </>
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
  const { unmarkPaid } = useBillMutations();
  const [pending, setPending] = React.useState<PendingBillAction | null>(null);
  const [showSettled, setShowSettled] = React.useState(false);
  const closePending = () => setPending(null);

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

  const actions: Actions = {
    busy: unmarkPaid.isPending,
    onMarkPaid: (bill) => bill.statementId && setPending({ type: 'mark_paid', statementId: bill.statementId }),
    onSetDetails: (bill) => bill.statementId && setPending({ type: 'set_details', statementId: bill.statementId }),
    onUnmarkPaid: async (bill) => {
      if (!bill.statementId) return;
      try {
        await unmarkPaid.mutateAsync(bill.statementId);
        router.refresh();
        showToast('Payment mark removed');
      } catch (e) {
        showToast(getErrorMessage(e, 'Could not undo the payment mark'), { tone: 'danger' });
      }
    },
  };

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
          <BillRow key={s.bill.accountId} state={s} highlighted={s.bill.accountId === highlightedAccountId} actions={actions} />
        ))}
        {n > 0 ? (
          <div data-testid="bills-nothing-pending">
            <div className="px-space-16 py-space-8">
              <Button variant="link" aria-expanded={showSettled} onClick={() => setShowSettled((v) => !v)}>
                Nothing pending · {n} {n === 1 ? 'card' : 'cards'}
              </Button>
            </div>
            {showSettled
              ? model.nothingPending.map((s) => (
                  <BillRow
                    key={s.bill.accountId}
                    state={s}
                    highlighted={s.bill.accountId === highlightedAccountId}
                    actions={actions}
                  />
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
      <InboxBillHost pending={pending} onClose={closePending} />
    </div>
  );
}
