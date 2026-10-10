'use client';

// emergency_fund: how many months the bank + wallet/cash balance would last at
// the usual monthly outflow (median of the last six full months), banded
// rose < 3, amber 3–6, emerald ≥ 6. The balance opens its accounts; each month
// bar opens that month's outflow. Months before the user's history are shown
// muted, not as zero spend.

import { AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { WidgetMessage, WidgetSkeleton } from '@/components/dashboards/WidgetStates';
import { LazyKpiUnderlyingDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { isAccountClosed } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { type EmergencyFund, type EmergencyFundMonth, useEmergencyFund } from '@/lib/query/hooks/useEmergencyFund';
import type { RunReportRequest } from '@/lib/reports.types';
import { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

import { DrillValue, formatRupees } from '../cards_spending_kit/kit';
import { liquidBalanceRequest, monthOutflowRequest } from './emergencyFund.requests';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BAND_TEXT: Record<string, string> = {
  low: 'text-rose-600 dark:text-rose-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-emerald-600 dark:text-emerald-400',
};

/** "Apr" (and the year, for labels: "Apr 2026") from YYYY-MM. */
export function monthName(month: string, withYear = false): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1] ?? month;
  return withYear ? `${name} ${y}` : name;
}

/** "4.2 months" / "1 month". */
export function formatMonthsCovered(months: number): string {
  const text = Number.isInteger(months) ? String(months) : months.toFixed(1);
  return `${text} ${months === 1 ? 'month' : 'months'}`;
}

function MonthBars({ months, onOpen }: { months: EmergencyFundMonth[]; onOpen: (m: EmergencyFundMonth) => void }) {
  const max = Math.max(0, ...months.filter((m) => !m.beforeHistory).map((m) => m.outflow));
  return (
    <div className="flex items-end gap-1.5" data-testid="emergency-month-bars">
      {months.map((m) => {
        const label = m.beforeHistory
          ? `${monthName(m.month, true)}: no history`
          : `${monthName(m.month, true)}: ${formatRupees(m.outflow)} outflow`;
        const height = m.beforeHistory ? 100 : max > 0 ? Math.max(4, (m.outflow / max) * 100) : 4;
        return (
          <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-12 w-full items-end">
              {m.beforeHistory ? (
                <span
                  className="w-full rounded-sm border border-dashed border-slate-200 dark:border-slate-700"
                  style={{ height: `${height}%` }}
                  title={label}
                  aria-label={label}
                  role="img"
                  data-before-history="true"
                />
              ) : (
                <button
                  type="button"
                  className="w-full rounded-sm bg-slate-300 transition-colors hover:bg-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-slate-600 dark:hover:bg-slate-500"
                  style={{ height: `${height}%` }}
                  title={label}
                  aria-label={label}
                  onClick={() => onOpen(m)}
                />
              )}
            </div>
            <span className={cn('text-2xs', m.beforeHistory ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400')}>
              {monthName(m.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Why there is no months-covered figure yet. */
export function noFigureReason(fund: EmergencyFund): string {
  if (fund.historyMonths === 0) {
    return 'Months covered appear once your bank and cash accounts have a full month of transactions.';
  }
  const span = `${fund.historyMonths} ${fund.historyMonths === 1 ? 'month' : 'months'}`;
  // The figure uses the median month, so a few months with outflow among mostly empty ones still give 0.
  if (fund.months.some((m) => !m.beforeHistory && Number(m.outflow) > 0)) {
    return `Most of the last ${span} had no outflow from your bank and cash accounts, so the usual monthly outflow is ₹0.`;
  }
  return `No outflow from your bank and cash accounts in the last ${span}.`;
}

const LIQUID_TYPES: readonly string[] = [AccountType.BANK_ACCOUNT, AccountType.GENERIC];

/**
 * No bank or cash account counts: either there is none open, or every open one
 * is marked excluded (the server leaves those out) — say which, so the way
 * forward is right ("include one" vs "add one").
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
      icon={ShieldCheck}
      title={allExcluded ? 'Your bank and cash accounts are excluded' : 'No bank or cash accounts'}
      description={
        allExcluded
          ? 'Accounts marked excluded are left out. Include one to see how long your money would last.'
          : 'Add a bank account or wallet to see how long your money would last.'
      }
      className="m-4"
      action={
        <Button asChild variant="link" size="xs">
          <Link href="/accounts">Go to accounts</Link>
        </Button>
      }
    />
  );
}

export function EmergencyFundWidget({ className }: { className?: string }) {
  const { data: fund, isLoading, error } = useEmergencyFund();
  const [drill, setDrill] = useState<{ title: string; request: RunReportRequest } | null>(null);

  let body;
  if (isLoading && !fund) {
    body = <WidgetSkeleton kind="kpi" />;
  } else if (error || !fund) {
    body = <WidgetMessage icon={AlertCircle} tone="danger" message={getErrorMessage(error, 'Failed to load the emergency fund')} />;
  } else if (fund.accounts.length === 0) {
    body = <NoLiquidAccounts />;
  } else {
    const openBalance = () => setDrill({ title: 'Bank and cash', request: liquidBalanceRequest() });
    const openMonth = (m: EmergencyFundMonth) =>
      setDrill({
        title: `Outflow · ${monthName(m.month, true)}`,
        request: monthOutflowRequest(m.month, fund.accounts.map((a) => a.id)),
      });
    const covered = fund.monthsCovered;
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-3" data-testid="emergency-fund">
        {covered != null ? (
          <div>
            <p
              className={cn('text-2xl font-bold tracking-tight tabular-nums', BAND_TEXT[fund.band ?? ''] ?? 'text-slate-900 dark:text-white')}
              data-testid="emergency-months"
              data-band={fund.band ?? undefined}
            >
              {formatMonthsCovered(covered)}
            </p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">
              Usual monthly outflow{' '}
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatRupees(fund.medianOutflow)}</span>
              {fund.historyMonths < 6 && ` · based on ${fund.historyMonths} ${fund.historyMonths === 1 ? 'month' : 'months'}`}
            </p>
          </div>
        ) : (
          <div data-testid="emergency-no-figure">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not enough history yet</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">{noFigureReason(fund)}</p>
          </div>
        )}
        <p className="text-2xs text-slate-500 dark:text-slate-400">
          <DrillValue
            onClick={openBalance}
            label="view bank and cash balances"
            className="font-semibold tabular-nums text-slate-700 dark:text-slate-200"
          >
            {formatRupees(fund.liquidBalance)}
          </DrillValue>{' '}
          in bank and cash
          {fund.liquidBalance <= 0 && covered == null ? ' — nothing set aside yet' : ''}
        </p>
        <MonthBars months={fund.months} onOpen={openMonth} />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)} data-testid="emergency-fund-widget">
      {body}
      {drill && (
        <LazyKpiUnderlyingDialog
          source={{ kind: 'adhoc', request: drill.request }}
          title={drill.title}
          open
          onOpenChange={(o) => !o && setDrill(null)}
        />
      )}
    </div>
  );
}
