'use client';

// milestone_progress (view `progress_list`): each card's nearest spend milestone in its current window — card,
// milestone name, percent and a progress bar — linking to that card on the Rewards page.

import React from 'react';

import { EmptyState, Text } from '@/components/ds';
import { BarRow, BuiltinNote, BuiltinPager } from '@/features/dashboards/builtins/BuiltinParts';
import type { TemplateViewProps } from '@/features/dashboards/builtins/types';
import { appHref } from '@/features/shell/routes';
import { todayInAppZone } from '@/lib/date-range';
import { isRawTableData } from '@/lib/reports.helpers';

import { nearestPerCard } from './milestoneProgressModel';

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
        />
      ))}
      <BuiltinPager page={data.page} unit="milestone" onPageChange={onPageChange} />
    </div>
  );
}
