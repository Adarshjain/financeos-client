'use client';

import Link from 'next/link';
import React from 'react';

import { Button, DateTile, Icon, ListRow, StatusWord, Text } from '@/components/ds';

import { daysText, obligationHref, type ObligationItem, obligationTitle } from './obligations';
import { rowAmount, rowDate, rowSubtitleParts } from './upcomingModel';

export interface UpcomingRowProps {
  item: ObligationItem;
  /** Mark paid is the primary button in the Next 7 days section, secondary elsewhere. */
  primaryAction?: boolean;
  highlighted?: boolean;
  onMarkPaid: (item: ObligationItem) => void;
  onSettle: (item: ObligationItem) => void;
}

/** One obligation in the Upcoming list: date tile, title and context, amount, then its action. */
export function UpcomingRow({
  item,
  primaryAction = false,
  highlighted = false,
  onMarkPaid,
  onSettle,
}: UpcomingRowProps) {
  const date = rowDate(item);
  const amount = rowAmount(item);
  const overdue = item.status === 'overdue';
  const dueSoon = item.type === 'card_bill' && item.status === 'due_soon';
  const parts = rowSubtitleParts(item, daysText);
  const pageHref =
    item.type === 'emi' || item.type === 'lending_due' ? obligationHref(item) : null;
  const uploadHref =
    item.type === 'statement_expected' && item.accountId
      ? `/transactions/import?account=${item.accountId}`
      : null;
  const canMarkPaid = item.type === 'card_bill' && Boolean(item.statementId);
  const canSettle = item.type === 'lending_due' && Boolean(item.counterpartyId);

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
      wrap
      highlighted={highlighted}
      data-bill-row={item.type === 'card_bill' ? (item.statementId ?? undefined) : undefined}
      leading={
        date ? (
          <DateTile day={date.day} monthLabel={date.monthLabel} />
        ) : (
          <Text tone="ink-4" align="center" className="w-10 shrink-0">
            —
          </Text>
        )
      }
      title={obligationTitle(item)}
      subtitle={subtitle}
      trailing={
        <>
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
          >
            {amount.text}
          </Text>
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
              <Link href={uploadHref} prefetch={false}>
                Upload
              </Link>
            </Button>
          ) : null}
          {canSettle ? (
            <Button variant="secondary" size="sm" onClick={() => onSettle(item)}>
              Settle
            </Button>
          ) : null}
          {pageHref ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              asChild
              icon={<Icon name="chevron-right" size="xs" />}
            >
              <Link href={pageHref} prefetch={false} aria-label="Open" />
            </Button>
          ) : null}
        </>
      }
    />
  );
}
