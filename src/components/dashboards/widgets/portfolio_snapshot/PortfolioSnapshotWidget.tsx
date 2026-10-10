'use client';

// portfolio_snapshot: current value (tap → the open holdings behind it),
// the move since the previous evening price update, then invested,
// unrealised P&L and XIRR.

import { Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LazyKpiUnderlyingDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { Button } from '@/components/ui/button';
import { usePortfolioSummary } from '@/lib/query/hooks/useInvestments';
import type { InvestmentSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

import {
  dayMonth,
  DrillValue,
  fullDate,
  gainTone,
  num,
  positionsValueRequest,
  rupees,
  signedPct,
  signedRupees,
  WidgetBody,
  WidgetEmpty,
  WidgetLoadError,
  WidgetLoadingRows,
} from '../investmentsLoansKit/kit';

const VALUE_SOURCE = { kind: 'adhoc', request: positionsValueRequest() } as const;

export function PortfolioSnapshotWidget({ className }: { className?: string }) {
  const { data, isLoading, error } = usePortfolioSummary();
  const [open, setOpen] = useState(false);

  let body;
  if (isLoading) body = <WidgetLoadingRows testId="portfolio-snapshot-loading" />;
  else if (error) body = <WidgetLoadError what="your portfolio" error={error} />;
  else if (!data || isEmptyPortfolio(data)) {
    body = (
      <WidgetEmpty
        icon={Briefcase}
        title="No holdings yet"
        description="Add a trade or import from your broker to see your portfolio here."
        action={
          <Button asChild variant="link" size="xs">
            <Link href="/investments">Go to investments</Link>
          </Button>
        }
      />
    );
  } else body = <Snapshot summary={data} onOpenValue={() => setOpen(true)} />;

  return (
    <WidgetBody className={className} testId="portfolio-snapshot-widget">
      {body}
      {open && (
        <LazyKpiUnderlyingDialog source={VALUE_SOURCE} title="Portfolio value" open onOpenChange={setOpen} />
      )}
    </WidgetBody>
  );
}

function isEmptyPortfolio(s: InvestmentSummary): boolean {
  return (num(s.totalCurrentValue) ?? 0) === 0 && (num(s.totalInvested) ?? 0) === 0;
}

function Snapshot({ summary, onOpenValue }: { summary: InvestmentSummary; onOpenValue: () => void }) {
  const value = num(summary.totalCurrentValue) ?? 0;
  const invested = num(summary.totalInvested) ?? 0;
  const unrealised = num(summary.totalUnrealized) ?? 0;
  const unrealisedPct = num(summary.totalUnrealizedPercent);
  const xirr = num(summary.xirr);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
      <div>
        <DrillValue
          onClick={onOpenValue}
          label="view underlying data for Portfolio value"
          className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
        >
          {rupees(value)}
        </DrillValue>
        <DayChangeLine summary={summary} />
      </div>
      <dl className="space-y-1.5 text-xs">
        <Row label="Invested" value={rupees(invested)} />
        <Row
          label="Unrealised P&L"
          value={`${signedRupees(unrealised)}${unrealisedPct != null ? ` (${signedPct(unrealisedPct)})` : ''}`}
          valueClass={gainTone(unrealised)}
        />
        <Row label="XIRR" value={xirr != null ? `${xirr.toFixed(1)}%` : '—'} />
      </dl>
    </div>
  );
}

/**
 * "+₹8,420 (+0.68%) since last update"; nothing until two evening prices exist.
 * The figure sums each holding's move from its own previous evening price, and
 * those windows can differ (fund NAVs land a day after stock prices), so no
 * single "since" date is claimed; the tooltip names the newest price date.
 */
function DayChangeLine({ summary }: { summary: InvestmentSummary }) {
  const change = num(summary.dayChange);
  if (change == null) return null;
  const pct = num(summary.dayChangePct);
  const title = summary.priceAsOf
    ? `Each holding's change since its previous evening price; latest prices from ${fullDate(summary.priceAsOf)}`
    : undefined;
  return (
    <p className={cn('text-2xs font-medium tabular-nums', gainTone(change))} title={title} data-testid="day-change">
      {signedRupees(change)}
      {pct != null && ` (${signedPct(pct)})`}
      <span className="font-normal text-slate-500 dark:text-slate-400"> since last update</span>
    </p>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 truncate text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={cn('shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white', valueClass)}>{value}</dd>
    </div>
  );
}
