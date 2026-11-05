'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { DateTile } from '@/components/ds/DateTile/DateTile';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { LoanClosedPrompt } from '@/features/loans/LoanClosedPrompt';
import { appHref } from '@/features/shell/routes';

import { daysText, obligationHref, type ObligationItem, obligationTitle } from './obligationsModel';
import { canSkipStatementItem, rowAmount, rowDate, rowSubtitleParts } from './upcomingModel';

export interface UpcomingRowProps {
  item: ObligationItem;
  /** Business today (YYYY-MM-DD): "No statement this period" shows only for a cycle that has ended. */
  today: string;
  /** Mark a statement-expected row's cycle as having no statement; the button shows only when given. */
  onSkipStatement?: (item: ObligationItem) => void;
  /** Mark paid is the primary button in the Next 7 days section, secondary elsewhere. */
  primaryAction?: boolean;
  highlighted?: boolean;
  /** Ask "Is this loan closed?" under this row (the loan's oldest EMI row only). */
  askClosed?: boolean;
  onMarkPaid: (item: ObligationItem) => void;
  onSettle: (item: ObligationItem) => void;
  /** Set details on an undated card bill; the link shows only when given. */
  onSetDetails?: (item: ObligationItem) => void;
  /** Stop tracking a regular payment; its row menu shows only when given. */
  onStopTracking?: (item: ObligationItem) => void;
}

/** One obligation in the Upcoming list: date tile, title and context, amount, then its action. */
export function UpcomingRow({
  item,
  today,
  onSkipStatement,
  primaryAction = false,
  highlighted = false,
  askClosed = false,
  onMarkPaid,
  onSettle,
  onSetDetails,
  onStopTracking,
}: UpcomingRowProps) {
  const router = useRouter();
  const date = rowDate(item);
  const amount = rowAmount(item);
  const overdue = item.status === 'overdue';
  const regular = item.type === 'recurring';
  const paid = regular && item.paid === true;
  const dueSoon = (item.type === 'card_bill' || regular) && item.status === 'due_soon' && !paid;
  const parts = rowSubtitleParts(item, daysText);
  const pageHref =
    item.type === 'emi' || item.type === 'lending_due' ? obligationHref(item) : null;
  const uploadHref =
    item.type === 'statement_expected' && item.accountId
      ? `/transactions/import?account=${item.accountId}`
      : null;
  const canSkipStatement = Boolean(onSkipStatement) && canSkipStatementItem(item, today);
  const canMarkPaid = item.type === 'card_bill' && Boolean(item.statementId);
  const canSetDetails =
    Boolean(onSetDetails) && item.type === 'card_bill' && !item.date && Boolean(item.statementId);
  const canSettle = item.type === 'lending_due' && Boolean(item.counterpartyId);

  const menuActions: { id: string; label: string; onSelect: () => void }[] = [];
  if (canSkipStatement) {
    menuActions.push({ id: 'no-statement', label: 'No statement this period', onSelect: () => onSkipStatement?.(item) });
  }
  if (regular && item.seriesId && onStopTracking) {
    menuActions.push({ id: 'stop', label: 'Stop tracking', onSelect: () => onStopTracking(item) });
  }

  const subtitle = (
    <>
      {parts.join(' · ')}
      {dueSoon ? (
        <>
          {parts.length > 0 ? ' · ' : ''}
          <StatusWord tone="warning" className="desk:hidden">
            Due soon
          </StatusWord>
        </>
      ) : null}
    </>
  );

  return (
    <ListRow
      clickable={Boolean(pageHref)}
      onClick={
        pageHref
          ? (e) => {
              // Buttons and links on the row do their own thing.
              if ((e.target as HTMLElement).closest('a,button')) return;
              router.push(appHref(pageHref));
            }
          : undefined
      }
      highlighted={highlighted}
      data-bill-row={item.type === 'card_bill' ? (item.statementId ?? undefined) : undefined}
      leading={
        date ? (
          <DateTile className="w-8" day={date.day} monthLabel={date.monthLabel} />
        ) : (
          <Text tone="ink-4" align="center" className="w-8 shrink-0">
            —
          </Text>
        )
      }
      actions={menuActions.length > 0 ? menuActions : undefined}
      title={obligationTitle(item)}
      subtitle={subtitle}
      trailing={
        <>
          {paid ? <StatusWord tone="success">Paid</StatusWord> : null}
          {overdue && item.amount == null ? (
            <StatusWord tone="warning" className="max-desk:hidden">
              Overdue
            </StatusWord>
          ) : null}
          {dueSoon ? (
            <StatusWord tone="warning" className="max-desk:hidden">
              Due soon
            </StatusWord>
          ) : null}
          <Text
            variant="body-strong"
            tone={amount.tone === 'none' ? 'ink-4' : amount.tone}
            fraction="small"
          >
            {amount.text}
          </Text>
          {canSetDetails ? (
            <Button variant="link" size="sm" onClick={() => onSetDetails?.(item)}>
              Set details
            </Button>
          ) : null}
          {canMarkPaid ? (
            <Button
              variant={primaryAction ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onMarkPaid(item)}
            >
              Mark paid
            </Button>
          ) : null}
          {uploadHref ? (
            <Button variant="secondary" size="sm" asChild>
              <Link href={appHref(uploadHref)} prefetch={false}>
                Upload
              </Link>
            </Button>
          ) : null}
          {canSettle ? (
            <Button variant="secondary" size="sm" onClick={() => onSettle(item)}>
              Settle
            </Button>
          ) : null}
        </>
      }
    >
      {askClosed && item.loanId ? <LoanClosedPrompt loanId={item.loanId} className="mt-space-8" /> : null}
    </ListRow>
  );
}
