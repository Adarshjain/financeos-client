'use client';

// emergency_fund: how many months the bank + wallet/cash balance would last at the usual monthly outflow
// (median of the last six full months), banded red < 3, amber 3–6, green ≥ 6. The balance opens its
// accounts, and a month's bar opens that month's outflow. Months before the user's history are left empty,
// not drawn as zero spend.

import React from 'react';

import { Button, EmptyState, Text } from '@/components/ds';
import { Chart } from '@/components/organisms';
import { BuiltinError } from '@/features/dashboards/builtins/BuiltinParts';
import type { BuiltinBodyProps } from '@/features/dashboards/builtins/types';
import { ReportUnderlyingDialog } from '@/features/reports/underlying/ReportUnderlyingDialog';
import { appHref } from '@/features/shell/routes';
import { isAccountClosed } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { formatCount, formatMoney } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { type EmergencyFund, useEmergencyFund } from '@/lib/query/hooks/useEmergencyFund';
import type { RunReportRequest } from '@/lib/reports.types';
import { AccountType } from '@/lib/types';

import { formatMonthsCovered, monthName, noFigureReason } from './emergencyFundModel';
import { liquidBalanceRequest, monthOutflowRequest } from './emergencyFundRequestsModel';
import { EmergencyFundSkeleton } from './EmergencyFundSkeleton';

const BAND_TONE = { low: 'danger', medium: 'warning', high: 'positive' } as const;

const LIQUID_TYPES: readonly string[] = [AccountType.BANK_ACCOUNT, AccountType.GENERIC];

/**
 * No bank or cash account counts: either there is none open, or every open one is marked excluded (the
 * server leaves those out) — say which, so the way forward is right ("include one" vs "add one").
 */
function NoLiquidAccounts() {
  const { data } = useAccounts();
  const today = todayInAppZone();
  const allExcluded = (Array.isArray(data) ? data : []).some(
    (a) => LIQUID_TYPES.includes(a.type) && !isAccountClosed(a, today) && a.excludeFromNetAsset,
  );
  return (
    <EmptyState
      compact
      description={
        allExcluded
          ? 'Accounts marked excluded are left out. Include one to see how long your money would last.'
          : 'Add a bank account or wallet to see how long your money would last.'
      }
      action={{ label: 'Go to accounts', href: appHref('/accounts'), variant: 'link' }}
    />
  );
}

function MonthBars({ fund, onOpen }: { fund: EmergencyFund; onOpen: (month: { month: string; outflow: number }) => void }) {
  return (
    <div data-testid="emergency-month-bars">
      <Chart
        money
        onSelectEntry={(entry) => {
          const month = fund.months.find((m) => !m.beforeHistory && monthName(m.month) === entry.key);
          if (month) onOpen(month);
        }}
        data={{
          chartType: 'bar',
          categories: fund.months.map((m) => monthName(m.month)),
          series: [{ name: 'Outflow', data: fund.months.map((m) => (m.beforeHistory ? null : m.outflow)) }],
          measure: { field: 'outflow', aggregation: 'sum' },
        }}
      />
    </div>
  );
}

export function EmergencyFundBody({ className }: BuiltinBodyProps) {
  const { data: fund, isLoading, error, refetch } = useEmergencyFund();
  const [drill, setDrill] = React.useState<{ title: string; request: RunReportRequest } | null>(null);

  let body: React.ReactNode;
  if (isLoading && !fund) {
    body = <EmergencyFundSkeleton />;
  } else if (error || !fund) {
    body = <BuiltinError message={getErrorMessage(error, "Couldn't load the emergency fund.")} action={{ label: 'Retry', onSelect: () => void refetch() }} />;
  } else if (fund.accounts.length === 0) {
    body = <NoLiquidAccounts />;
  } else {
    const covered = fund.monthsCovered;
    body = (
      <div className="flex flex-col gap-space-8" data-testid="emergency-fund">
        {covered != null ? (
          <div className="flex flex-col gap-space-2">
            <Text
              variant="figure"
              as="div"
              tone={BAND_TONE[(fund.band ?? '') as keyof typeof BAND_TONE] ?? 'ink'}
              data-testid="emergency-months"
              data-band={fund.band ?? undefined}
            >
              {formatMonthsCovered(covered)}
            </Text>
            <Text variant="caption" tone="ink-3" as="p">
              Usual monthly outflow <strong>{formatMoney(fund.medianOutflow)}</strong>
              {fund.historyMonths < 6 ? ` · based on ${formatCount(fund.historyMonths, ['month', 'months'])}` : ''}
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-space-2" data-testid="emergency-no-figure">
            <Text variant="body-strong" as="p">
              Not enough history yet
            </Text>
            <Text variant="caption" tone="ink-3" as="p">
              {noFigureReason(fund)}
            </Text>
          </div>
        )}
        <Text variant="caption" tone="ink-3" as="p">
          <Button
            variant="link"
            onClick={() =>
              setDrill({ title: `Bank and cash · ${formatMoney(fund.liquidBalance)}`, request: liquidBalanceRequest() })
            }
          >
            {formatMoney(fund.liquidBalance)}
          </Button>{' '}
          in bank and cash
          {fund.liquidBalance <= 0 && covered == null ? ' — nothing set aside yet' : ''}
        </Text>
        <MonthBars
          fund={fund}
          onOpen={(month) =>
            setDrill({
              title: `Outflow · ${monthName(month.month, true)} · ${formatMoney(month.outflow)}`,
              request: monthOutflowRequest(month.month, fund.accounts.map((a) => a.id)),
            })
          }
        />
      </div>
    );
  }
  return (
    <div className={className} data-testid="emergency-fund-widget">
      {body}
      {drill ? <ReportUnderlyingDialog request={drill.request} title={drill.title} onClose={() => setDrill(null)} /> : null}
    </div>
  );
}
