'use client';

// portfolio_snapshot: current value (tap: the open holdings behind it), the move since the previous evening
// price update, then invested, unrealised P&L and XIRR, then the three largest holdings (each opens its page).
// Content only; the dashboard frame draws the card.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, EmptyState, ListField, ListRow, Skeleton, Text } from '@/components/ds';
import { moveTone, plainPct, quantity, rupees, shortDate, signedPct, signedRupees } from '@/features/investments/investmentsFormat';
import { holdingHref,HOLDINGS_HREF } from '@/features/investments/investmentsTabs';
import { usePortfolioSummary, usePositions } from '@/lib/query/hooks/useInvestments';
import type { InvestmentSummary } from '@/lib/types';

import { num, positionsValueRequest } from '../investmentsLoansData';
import { BodyError, LazyReportUnderlyingDialog } from '../investmentsLoansParts';
import { topHoldings } from './topHoldings';

const VALUE_REQUEST = positionsValueRequest();

/** The widget's loading skeleton: the figure, its day line, then three label/value rows. */
export function PortfolioSnapshotSkeleton() {
  return (
    <div data-testid="portfolio-snapshot-loading">
      <div className="flex flex-col gap-space-8 px-space-16 pb-space-12">
        <Skeleton width="50%" height={22} />
        <Skeleton width="40%" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-space-12 px-space-16 py-space-8">
          <Skeleton width="30%" />
          <Skeleton width="25%" />
        </div>
      ))}
    </div>
  );
}

function isEmptyPortfolio(s: InvestmentSummary): boolean {
  return (num(s.totalCurrentValue) ?? 0) === 0 && (num(s.totalInvested) ?? 0) === 0;
}

export function PortfolioSnapshotBody() {
  const { data, isLoading, error, refetch } = usePortfolioSummary();
  const { data: positions } = usePositions();
  const holdings = React.useMemo(() => topHoldings(positions ?? []), [positions]);
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  if (isLoading) return <PortfolioSnapshotSkeleton />;
  if (error) return <BodyError what="your portfolio" error={error} retry={() => void refetch()} />;
  if (!data || isEmptyPortfolio(data)) {
    return (
      <EmptyState
        size="sm"
        title="No holdings yet"
        description="Add a trade or import from your broker to see your portfolio here."
        action={{ label: 'Go to investments', variant: 'link', onSelect: () => router.push(HOLDINGS_HREF) }}
      />
    );
  }

  const value = num(data.totalCurrentValue) ?? 0;
  const unrealised = num(data.totalUnrealized) ?? 0;
  const unrealisedPct = num(data.totalUnrealizedPercent);
  const xirr = num(data.xirr);
  return (
    <div data-testid="portfolio-snapshot-widget">
      <div className="px-space-16 pb-space-12">
        <Text variant="figure" as="div">
          <Button variant="link" onClick={() => setOpen(true)} title="View underlying data for Portfolio value">
            {rupees(value)}
          </Button>
        </Text>
        <DayChangeLine summary={data} />
      </div>
      <ListField label="Invested" value={rupees(num(data.totalInvested) ?? 0)} />
      <ListField
        label="Unrealised P&L"
        value={
          <Text variant="body-strong" tone={moveTone(unrealised) ?? 'ink'}>
            {`${signedRupees(unrealised)}${unrealisedPct != null ? ` (${signedPct(unrealisedPct, 2)})` : ''}`}
          </Text>
        }
      />
      <ListField label="XIRR" value={xirr != null ? plainPct(xirr) : '—'} />
      {holdings.length > 0 && (
        <div role="list" aria-label="Top holdings" data-testid="top-holdings">
          {holdings.map((h) => (
            <div key={h.holdingId} role="listitem">
              <ListRow
                asChild
                title={h.label}
                subtitle={`${quantity(h.quantity)} sh`}
                trailing={
                  h.dayChangePct != null ? (
                    <Text variant="body-strong" tone={moveTone(h.dayChangePct) ?? 'ink'}>
                      {signedPct(h.dayChangePct)}
                    </Text>
                  ) : null
                }
              >
                <Link href={holdingHref(h.instrumentId)} />
              </ListRow>
            </div>
          ))}
        </div>
      )}
      {open && (
        <LazyReportUnderlyingDialog
          request={VALUE_REQUEST}
          title={`Portfolio value · ${rupees(value)}`}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * "+₹8,420 (+0.68%) since last update"; nothing until two evening prices exist. Each holding's move runs from
 * its own previous evening price, so no single "since" date is claimed; the tooltip names the newest price date.
 */
function DayChangeLine({ summary }: { summary: InvestmentSummary }) {
  const change = num(summary.dayChange);
  if (change == null) return null;
  const pct = num(summary.dayChangePct);
  const title = summary.priceAsOf
    ? `Each holding's change since its previous evening price; latest prices from ${shortDate(summary.priceAsOf)}`
    : undefined;
  return (
    <Text variant="label" tone={moveTone(change) ?? 'ink'} as="div" title={title} data-testid="day-change">
      {signedRupees(change)}
      {pct != null && ` (${signedPct(pct, 2)})`}{' '}
      <Text variant="label" tone="ink-3">since last update</Text>
    </Text>
  );
}
