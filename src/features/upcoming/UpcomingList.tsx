'use client';

import React from 'react';

import { Button, Card, Icon, ListRow, SectionHeader, Text } from '@/components/ds';
import { formatMoney } from '@/lib/format';
import { ListTransition, RowTransition, useDeferredRows } from '@/lib/viewTransition';

import { bucketObligations, type ObligationItem, sumAmounts } from './obligations';
import { foldedMonthLine } from './upcomingModel';
import { UpcomingRow } from './UpcomingRow';

interface Section {
  key: string;
  name: string;
  items: ObligationItem[];
  danger?: boolean;
  primaryAction?: boolean;
  /** Months after the first collapse to one line until shown. */
  foldable?: boolean;
  foldedLine?: string;
}

export interface UpcomingListProps {
  items: ObligationItem[];
  today: string;
  /** The card bill opened from a notification: its row is highlighted (and its month shown). */
  highlightStatementId: string | null;
  onMarkPaid: (item: ObligationItem) => void;
  onSettle: (item: ObligationItem) => void;
  onSetDetails?: (item: ObligationItem) => void;
}

function sections(items: ObligationItem[], today: string): Section[] {
  const b = bucketObligations(items, today);
  return [
    { key: 'overdue', name: 'Overdue', items: b.overdue, danger: true },
    { key: 'next7', name: 'Next 7 days', items: b.next7, primaryAction: true },
    { key: 'later', name: 'Later this month', items: b.laterThisMonth },
    { key: 'undated', name: 'Due date unknown', items: b.undated },
    ...b.months.map((m, i) => ({
      key: m.key,
      name: m.label.split(' ')[0],
      items: m.items,
      foldable: i > 0,
      foldedLine: foldedMonthLine(m.label, m.items),
    })),
  ].filter((s) => s.items.length > 0);
}

/**
 * A key per row that stays with the item when rows above it come or go, so a paid row folds away and the
 * rest move up instead of being redrawn. Two items with the same identity get a running suffix.
 */
export function upcomingRowKeys(items: readonly ObligationItem[]): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = `${item.type}-${item.statementId ?? item.loanId ?? item.counterpartyId ?? item.accountId}-${item.installmentSeq ?? ''}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  });
}

/** The Upcoming list: one Card, a section per bucket, later months folded into one line each. */
export function UpcomingList({
  items,
  today,
  highlightStatementId,
  onMarkPaid,
  onSettle,
  onSetDetails,
}: UpcomingListProps) {
  const [shown, setShown] = React.useState<Set<string>>(() => new Set());
  // A paid or settled row leaves after a refetch (outside a transition); deferring the rows lets it fold away.
  const shownItems = useDeferredRows(items);

  return (
    <ListTransition>
      <Card>
        {sections(shownItems, today).map((s) => {
          const hasHighlight =
            Boolean(highlightStatementId) &&
            s.items.some((i) => i.statementId === highlightStatementId);
          if (s.foldable && !shown.has(s.key) && !hasHighlight) {
            return (
              <RowTransition key={s.key}>
                <ListRow
                  data-testid={`folded-${s.key}`}
                  title={
                    <Text tone="ink-3" as="span">
                      {s.foldedLine}
                    </Text>
                  }
                  trailing={
                    <Text variant="label" as="span">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShown((prev) => new Set(prev).add(s.key))}
                      >
                        Show
                        <Icon name="chevron-right" size="xs" />
                      </Button>
                    </Text>
                  }
                />
              </RowTransition>
            );
          }
          const total = s.items.some((i) => i.amount != null)
            ? formatMoney(sumAmounts(s.items), { decimals: 'auto' })
            : null;
          const keys = upcomingRowKeys(s.items);
          return (
            <React.Fragment key={s.key}>
              <RowTransition key="header">
                <SectionHeader
                  variant="strong"
                  sticky={false}
                  tone={s.danger ? 'danger' : 'neutral'}
                  action={
                    total ? (
                      <Text variant="label" tone={s.danger ? 'danger' : 'ink'}>
                        {total}
                      </Text>
                    ) : undefined
                  }
                >
                  {`${s.name} · ${s.items.length}`}
                </SectionHeader>
              </RowTransition>
              {s.items.map((item, idx) => (
                <RowTransition key={keys[idx]}>
                  <UpcomingRow
                    item={item}
                    primaryAction={s.primaryAction}
                    highlighted={
                      Boolean(highlightStatementId) && item.statementId === highlightStatementId
                    }
                    onMarkPaid={onMarkPaid}
                    onSettle={onSettle}
                    onSetDetails={onSetDetails}
                  />
                </RowTransition>
              ))}
            </React.Fragment>
          );
        })}
      </Card>
    </ListTransition>
  );
}
