'use client';

// account_tile: one account at a glance — its name, and the balance as the account page heads it (a
// card's amount owed, or "In credit") opening its breakdown, and a 30-day trend (none for brokers). Built to
// read at quarter width.

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Text } from '@/components/ds/Text/Text';
import { buildHeaderModel } from '@/features/accounts/detail/overview/headerModel';
import { BuiltinError, BuiltinNote } from '@/features/dashboards/builtins/BuiltinParts';
import { stringParam } from '@/features/dashboards/builtins/subtitlesModel';
import type { BuiltinBodyProps } from '@/features/dashboards/builtins/types';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { LazyChart as Chart, useChartReady } from '@/lib/lazy/LazyChart';
import { useAccount } from '@/lib/query/hooks/useAccounts';
import { useBalanceSeries } from '@/lib/query/hooks/useBalanceSeries';
import { AccountType } from '@/lib/types';

import { AccountTileSkeleton } from './AccountTileSkeleton';
import { ACCOUNT_TILE_DAYS, trendValues } from './accountTrendModel';

/** The server answered 404 (a thrown action error carries the server's code; the browser client's also its status). */
function isNotFound(error: unknown): boolean {
  const e = error as { status?: number; code?: string; response?: { code?: string } } | null;
  return e?.status === 404 || e?.code === 'NOT_FOUND' || e?.response?.code === 'NOT_FOUND';
}

/** The last 30 days as a sparkline. */
function Trend({ account, balances, dates }: { account: Account; balances: number[]; dates: string[] }) {
  return (
    <div data-testid="account-trend">
      <Chart
        money
        data={{
          chartType: 'sparkline',
          categories: dates,
          series: [{ name: account.name, data: trendValues(account, balances) }],
          measure: { field: 'balance', aggregation: 'sum' },
        }}
      />
    </div>
  );
}

export function AccountTileBody({ params, className }: BuiltinBodyProps) {
  const accountId = stringParam(params, 'accountId');
  const { data: account, isLoading, error, refetch } = useAccount(accountId ?? '');
  const [open, setOpen] = React.useState(false);
  // The trend's series and the chart's code are waited for with the account, under the tile's one skeleton; no trend with
  // fewer than two days, for a broker, or when the series fails.
  const withTrend = Boolean(account) && account?.type !== AccountType.BROKER;
  const series = useBalanceSeries(account?.id ?? '', ACCOUNT_TILE_DAYS, { enabled: withTrend });
  const points = withTrend && Array.isArray(series.data) ? series.data : [];
  const trending = points.length >= 2;
  const chartReady = useChartReady(trending);

  let body: React.ReactNode;
  if (!accountId) {
    body = <BuiltinNote>Pick an account in Widget settings.</BuiltinNote>;
  } else if ((isLoading && !account) || (withTrend && series.isLoading) || (trending && !chartReady)) {
    body = <AccountTileSkeleton />;
  } else if (error || !account) {
    body =
      !account && (!error || isNotFound(error)) ? (
        <BuiltinNote>This account no longer exists.</BuiltinNote>
      ) : (
        <BuiltinError message={getErrorMessage(error, "Couldn't load the account.")} action={{ label: 'Retry', onSelect: () => void refetch() }} />
      );
  } else {
    const { label, figure } = buildHeaderModel(account, null, todayInAppZone());
    body = (
      <div className="flex flex-col gap-space-2" data-testid="account-tile">
        <Text variant="body-strong" as="div" truncate>
          {account.name}
        </Text>
        <Text variant="overline" tone="ink-3" as="div">
          {label}
        </Text>
        <Text variant="figure" as="div" truncate>
          <Button variant="link" size="inherit" onClick={() => setOpen(true)}>
            {figure}
          </Button>
        </Text>
        {trending ? <Trend account={account} dates={points.map((p) => p.date)} balances={points.map((p) => p.balance)} /> : null}
      </div>
    );
  }
  return (
    <div className={className} data-testid="account-tile-widget">
      {body}
      {open && account ? (
        <LazyReportRowBreakdownDialog datasource="net_worth" rowId={account.id} title={account.name} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
