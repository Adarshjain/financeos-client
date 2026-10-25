'use client';

// milestone_progress (view `progress_list`): each card's nearest spend milestone in its current window —
// progress bar, days left and the daily pace still needed — linking to that card on the Rewards page.

import React from 'react';

import { EmptyState, Text } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { todayInAppZone } from '@/lib/date-range';
import { isRawTableData } from '@/lib/reports.helpers';
import { formatMoney } from '@/lib/utils';

import { formatCount } from '../builtin.helpers';
import { BarRow, BuiltinNote, BuiltinPager } from '../BuiltinParts';
import type { TemplateViewProps } from '../types';
import { type MilestoneItem, nearestPerCard } from './milestoneProgress.model';

function amount(value: number, counts: boolean): string {
  return counts ? formatCount(value) : formatMoney(value);
}

function payoutHint(it: MilestoneItem): string | null {
  if (it.payoutValue != null && it.payoutValue > 0) {
    return it.rewardType === 'POINTS' ? `Pays ${formatCount(it.payoutValue)} pts` : `Pays ${formatMoney(it.payoutValue)}`;
  }
  return it.rewardTypeLabel ? `Pays ${it.rewardTypeLabel.toLowerCase()}` : null;
}

function paceText(it: MilestoneItem): string | null {
  if (it.perDay == null) return null;
  return it.countsTransactions
    ? `${Math.ceil(it.perDay)} txn/day to hit it`
    : `${formatMoney(Math.ceil(it.perDay))}/day to hit it`;
}

function details(it: MilestoneItem): string {
  const achieved = it.progress >= it.threshold && it.threshold > 0;
  return [
    `${amount(it.progress, it.countsTransactions)} of ${amount(it.threshold, it.countsTransactions)}${it.countsTransactions ? ' txns' : ''}`,
    it.daysLeft > 0 ? `${it.daysLeft} ${it.daysLeft === 1 ? 'day' : 'days'} left` : 'Window ended',
    achieved ? 'Reached' : paceText(it),
    payoutHint(it),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function MilestoneProgressView({ data, loading, onPageChange }: TemplateViewProps) {
  if (!isRawTableData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  const items = nearestPerCard(data, todayInAppZone());
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="No milestones in progress"
        description="Add spend milestones to a card on the Rewards page to track them here."
      />
    );
  }
  return (
    <div data-testid="milestone-progress-view" aria-busy={loading || undefined}>
      {items.map((it) => (
        <BarRow
          key={it.id || it.cardId}
          data-testid="milestone-row"
          href={appHref(`/rewards?account=${encodeURIComponent(it.cardId)}`)}
          title={
            <>
              {it.card}
              <Text tone="ink-3"> · {it.milestone}</Text>
            </>
          }
          trailing={<Text variant="body-strong">{Math.floor(it.pct)}%</Text>}
          value={it.pct}
          caption={details(it)}
        />
      ))}
      <BuiltinPager page={data.page} unit="milestone" onPageChange={onPageChange} />
    </div>
  );
}
