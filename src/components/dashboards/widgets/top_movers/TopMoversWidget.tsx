'use client';

// top_movers: the open holdings that moved most since the previous evening
// price, as Gainers / Losers tabs (two short lists don't fit half width).
// A row opens that holding's breakdown. When the listed holdings' windows
// differ (fund NAVs land a day after stock prices) the footer says "since last
// update" and each row shows its own previous close → price dates.

import { TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { LazyRowBreakdownDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePositions } from '@/lib/query/hooks/useInvestments';
import { cn } from '@/lib/utils';

import {
  dayMonth,
  gainTone,
  rupees,
  signedPct,
  signedRupees,
  WidgetBody,
  WidgetEmpty,
  WidgetLoadError,
  WidgetLoadingRows,
} from '../investmentsLoansKit/kit';
import { type Mover, topMovers } from './topMovers';

type Side = 'gainers' | 'losers';

export function TopMoversWidget({ n, className }: { n: number; className?: string }) {
  const { data: positions, isLoading, error } = usePositions();
  const movers = useMemo(() => topMovers(positions ?? [], n), [positions, n]);
  const [picked, setPicked] = useState<Side | null>(null);
  const [opened, setOpened] = useState<Mover | null>(null);

  // Gainers first, unless there are none today.
  const side: Side = picked ?? (movers.gainers.length === 0 && movers.losers.length > 0 ? 'losers' : 'gainers');
  const rows = side === 'gainers' ? movers.gainers : movers.losers;
  const hasAny = movers.gainers.length + movers.losers.length > 0;

  let body;
  if (isLoading) body = <WidgetLoadingRows testId="top-movers-loading" />;
  else if (error) body = <WidgetLoadError what="your holdings" error={error} />;
  else if (!hasAny) {
    body = (
      <WidgetEmpty
        icon={TrendingUp}
        title="No price moves yet"
        description="Moves show up once your holdings have two evening prices."
      />
    );
  } else {
    body = (
      <>
        <div className="shrink-0 px-4 pb-2">
          <Tabs value={side} onValueChange={(v) => setPicked(v as Side)}>
            <TabsList className="grid h-8 w-full grid-cols-2 text-xs">
              <TabsTrigger value="gainers" className="px-2.5 text-xs">
                Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" className="px-2.5 text-xs">
                Losers
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {rows.length === 0 ? (
          <p className="flex-1 px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            {side === 'gainers' ? 'Nothing went up' : 'Nothing went down'}
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800" aria-label={side === 'gainers' ? 'Gainers' : 'Losers'}>
            {rows.map((m) => (
              <MoverRow key={m.holdingId} mover={m} showWindow={movers.mixed} onOpen={() => setOpened(m)} />
            ))}
          </ul>
        )}
        {(movers.since || movers.mixed) && (
          <p className="shrink-0 border-t border-slate-100 px-4 py-1.5 text-2xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {movers.mixed ? 'Since last update' : `Since ${dayMonth(movers.since)}`}, updated each evening
          </p>
        )}
      </>
    );
  }

  return (
    <WidgetBody className={className} testId="top-movers-widget">
      {body}
      {opened && (
        <LazyRowBreakdownDialog
          datasource="positions"
          rowId={opened.holdingId}
          title={opened.name}
          open
          onOpenChange={(o) => !o && setOpened(null)}
        />
      )}
    </WidgetBody>
  );
}

/** "08/10 → 09/10": the row's own previous close → latest price (when the rows' windows differ). */
export function moverWindow(mover: Mover): string | null {
  if (!mover.previousCloseAsOf) return null;
  const to = mover.lastPriceAsOf ? dayMonth(mover.lastPriceAsOf) : null;
  return to ? `${dayMonth(mover.previousCloseAsOf)} → ${to}` : `since ${dayMonth(mover.previousCloseAsOf)}`;
}

function MoverRow({ mover, showWindow, onOpen }: { mover: Mover; showWindow: boolean; onOpen: () => void }) {
  const tone = gainTone(mover.changePct);
  const dates = showWindow ? moverWindow(mover) : null;
  const detail = [mover.price != null ? rupeesWithPaise(mover.price) : null, dates].filter(Boolean).join(' · ');
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-200">{mover.name}</span>
          {detail && <span className="block truncate text-2xs tabular-nums text-slate-500 dark:text-slate-400">{detail}</span>}
        </span>
        <span className="shrink-0 text-right tabular-nums">
          <span className={cn('block text-xs font-semibold', tone)}>{signedPct(mover.changePct)}</span>
          <span className={cn('block text-2xs', tone)}>{signedRupees(mover.change)}</span>
        </span>
      </button>
    </li>
  );
}

const WITH_PAISE = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/** A unit price keeps its paise (₹1,234.50); whole-rupee prices drop them. */
function rupeesWithPaise(value: number): string {
  return Number.isInteger(value) ? rupees(value) : WITH_PAISE.format(value);
}
