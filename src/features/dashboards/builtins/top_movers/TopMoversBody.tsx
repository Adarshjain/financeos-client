'use client';

// top_movers: the open holdings that moved most since the previous evening price, as Gainers / Losers (two
// short lists don't fit half width). A row opens that holding's breakdown. When the listed holdings' windows differ
// (fund NAVs land a day after stock prices) the footer says "since last update" and each row shows its own
// previous close → price dates. Content only; the dashboard frame draws the card.

import React from 'react';

import { EmptyState, ListRow, SegmentedControl, Skeleton, Text } from '@/components/ds';
import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { moveTone, signedPct, signedRupees, unitPrice } from '@/features/investments/investmentsFormat';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { usePositions } from '@/lib/query/hooks/useInvestments';

import { BodyError } from '../investmentsLoansParts';
import { dayMonthShort, moverWindow } from './moverWindow';
import { type Mover, topMovers } from './topMovers';

type Side = 'gainers' | 'losers';

const SIDES = [
  { value: 'gainers', label: 'Gainers' },
  { value: 'losers', label: 'Losers' },
];

/** The widget's loading skeleton: the Gainers / Losers switch over three rows. */
export function TopMoversSkeleton() {
  return (
    <div data-testid="movers-loading">
      <div className="px-space-16 pb-space-8">
        <Skeleton height={32} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-space-12 px-space-16 py-space-10">
          <div className="flex min-w-0 flex-1 flex-col gap-space-4">
            <Skeleton width="55%" />
            <Skeleton width="30%" />
          </div>
          <Skeleton width={56} />
        </div>
      ))}
    </div>
  );
}

function MoverRow({ mover, showWindow, onOpen }: { mover: Mover; showWindow: boolean; onOpen: (mover: Mover) => void }) {
  const tone = moveTone(mover.changePct) ?? 'ink';
  const dates = showWindow ? moverWindow(mover, dayMonthShort) : null;
  const detail = [mover.price != null ? unitPrice(mover.price) : null, dates].filter(Boolean).join(' · ');
  return (
    <ListRow
      onClick={() => onOpen(mover)}
      title={mover.name}
      subtitle={detail || undefined}
      trailing={
        <div className="text-right">
          <Text variant="body-strong" tone={tone} as="div">{signedPct(mover.changePct)}</Text>
          <Text variant="caption" tone={tone} as="div">{signedRupees(mover.change)}</Text>
        </div>
      }
    />
  );
}

export function TopMoversBody({ n }: { n: number }) {
  const { data: positions, isLoading, error, refetch } = usePositions();
  const movers = React.useMemo(() => topMovers(positions ?? [], n), [positions, n]);
  const [picked, setPicked] = React.useState<Side | null>(null);
  const [opened, setOpened] = React.useState<Mover | null>(null);

  if (isLoading) return <TopMoversSkeleton />;
  if (error) return <BodyError what="your holdings" error={error} retry={() => void refetch()} />;
  if (movers.gainers.length + movers.losers.length === 0) {
    return (
      <EmptyState
        compact
        title="No price moves yet"
        description="Moves show up once your holdings have two evening prices."
      />
    );
  }

  // Gainers first, unless there are none today.
  const side: Side = picked ?? (movers.gainers.length === 0 && movers.losers.length > 0 ? 'losers' : 'gainers');
  const rows = side === 'gainers' ? movers.gainers : movers.losers;
  return (
    <div data-testid="movers-widget">
      <div className="px-space-16 pb-space-8">
        <SegmentedControl
          fullWidth
          aria-label="Movers"
          options={SIDES}
          value={side}
          onValueChange={(v) => setPicked(v as Side)}
        />
      </div>
      {rows.length === 0 ? (
        <div className="px-space-16 py-space-12">
          <Text tone="ink-3" align="center" as="p">{side === 'gainers' ? 'Nothing went up' : 'Nothing went down'}</Text>
        </div>
      ) : (
        <div role="list" aria-label={side === 'gainers' ? 'Gainers' : 'Losers'}>
          {rows.map((m) => (
            <div key={m.holdingId} role="listitem">
              <MoverRow mover={m} showWindow={movers.mixed} onOpen={setOpened} />
            </div>
          ))}
        </div>
      )}
      {(movers.since || movers.mixed) && (
        <div className="px-space-16 py-space-8">
          <Text variant="caption" tone="ink-3" as="p">
            {movers.mixed ? 'Since last update' : `Since ${formatDayMonth(movers.since ?? '')}`}, updated each evening
          </Text>
        </div>
      )}
      {opened ? (
        <LazyReportRowBreakdownDialog datasource="positions" rowId={opened.holdingId} title={opened.name} onClose={() => setOpened(null)} />
      ) : null}
    </div>
  );
}

