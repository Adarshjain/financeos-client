'use client';

// milestone_progress (view `progress_list`): each card's nearest spend
// milestone in its current window — progress bar, days left and the daily pace
// still needed — linking to that card on the Rewards page.

import { Trophy } from 'lucide-react';
import Link from 'next/link';

import type { TemplateViewProps } from '@/components/dashboards/builtins/registry';
import { EmptyState } from '@/components/ui/empty-state';
import { todayInAppZone } from '@/lib/date-range';
import { isRawTableData } from '@/lib/reports.helpers';
import { formatMoney } from '@/lib/utils';

import { formatCount, ListPager, WidgetNote } from '../cards_spending_kit/kit';
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

function MilestoneRow({ it }: { it: MilestoneItem }) {
  const achieved = it.progress >= it.threshold && it.threshold > 0;
  const width = `${Math.min(100, Math.max(0, it.pct))}%`;
  const details = [
    `${amount(it.progress, it.countsTransactions)} of ${amount(it.threshold, it.countsTransactions)}${it.countsTransactions ? ' txns' : ''}`,
    it.daysLeft > 0 ? `${it.daysLeft} ${it.daysLeft === 1 ? 'day' : 'days'} left` : 'Window ended',
    achieved ? 'Reached' : paceText(it),
  ].filter(Boolean);
  const hint = payoutHint(it);
  return (
    <li data-testid="milestone-row">
      <Link
        href={`/rewards?account=${encodeURIComponent(it.cardId)}`}
        className="block space-y-1.5 px-4 py-2.5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-white">
            {it.card}
            <span className="font-normal text-slate-500 dark:text-slate-400"> · {it.milestone}</span>
          </span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {Math.floor(it.pct)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width }} />
        </div>
        <p className="text-2xs tabular-nums text-slate-500 dark:text-slate-400">{details.join(' · ')}</p>
        {hint && <p className="text-2xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </Link>
    </li>
  );
}

export function MilestoneProgressView({ data, loading, onPageChange }: TemplateViewProps) {
  if (!isRawTableData(data)) return <WidgetNote>This widget can&apos;t show this data.</WidgetNote>;
  const items = nearestPerCard(data, todayInAppZone());
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={Trophy}
        title="No milestones in progress"
        description="Add spend milestones to a card on the Rewards page to track them here."
        className="m-4"
      />
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="milestone-progress-view">
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {items.map((it) => (
          <MilestoneRow key={it.id || it.cardId} it={it} />
        ))}
      </ul>
      <ListPager page={data.page} unit="milestone" onPageChange={onPageChange} loading={loading} />
    </div>
  );
}
