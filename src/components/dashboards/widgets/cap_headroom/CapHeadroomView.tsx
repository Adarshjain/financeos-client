'use client';

// cap_headroom (view `cap_list`): reward caps in their current window, most
// used first — amber from 80%, rose with "Cap hit" at 100% — each linking to
// its card on the Rewards page.

import { Hourglass } from 'lucide-react';
import Link from 'next/link';

import type { TemplateViewProps } from '@/components/dashboards/builtins/registry';
import { isoToDisplay } from '@/components/ui/date-input';
import { EmptyState } from '@/components/ui/empty-state';
import { isRawTableData } from '@/lib/reports.helpers';
import { cn, formatMoney } from '@/lib/utils';

import { formatCount, ListPager, WidgetNote } from '../cards_spending_kit/kit';
import { type CapItem, capItems, type CapTone } from './capHeadroom.model';

const BAR: Record<CapTone, string> = {
  neutral: 'bg-slate-400 dark:bg-slate-500',
  near: 'bg-amber-500',
  hit: 'bg-rose-500',
};
const TEXT: Record<CapTone, string> = {
  neutral: 'text-slate-600 dark:text-slate-300',
  near: 'text-amber-600 dark:text-amber-400',
  hit: 'text-rose-600 dark:text-rose-400',
};

function inUnit(value: number, unit: string): string {
  return unit === 'POINTS' ? `${formatCount(value)} pts` : formatMoney(value);
}

function CapRow({ it }: { it: CapItem }) {
  const width = `${Math.min(100, Math.max(0, it.pct ?? 0))}%`;
  return (
    <li data-testid="cap-row" data-tone={it.tone}>
      <Link
        href={`/rewards?account=${encodeURIComponent(it.cardId)}`}
        className="block space-y-1.5 px-4 py-2.5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-white">
            {it.card}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              {' '}
              · {it.cap}
              {it.cardholder ? ` · ${it.cardholder}` : ''}
            </span>
          </span>
          <span className={cn('shrink-0 text-xs font-semibold tabular-nums', TEXT[it.tone])}>
            {it.tone === 'hit' ? 'Cap hit' : `${Math.floor(it.pct ?? 0)}%`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={cn('h-full rounded-full', BAR[it.tone])} style={{ width }} />
        </div>
        <p className="text-2xs tabular-nums text-slate-500 dark:text-slate-400">
          {inUnit(it.used, it.unit)} of {inUnit(it.limit, it.unit)}
          {it.windowEnd ? ` · resets after ${isoToDisplay(it.windowEnd)}` : ''}
        </p>
      </Link>
    </li>
  );
}

export function CapHeadroomView({ data, loading, onPageChange }: TemplateViewProps) {
  if (!isRawTableData(data)) return <WidgetNote>This widget can&apos;t show this data.</WidgetNote>;
  const items = capItems(data);
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={Hourglass}
        title="No reward caps this cycle"
        description="Caps on your cards' reward rules show up here as you spend."
        className="m-4"
      />
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="cap-headroom-view">
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {items.map((it) => (
          <CapRow key={it.id} it={it} />
        ))}
      </ul>
      <ListPager page={data.page} unit="cap" onPageChange={onPageChange} loading={loading} />
    </div>
  );
}
