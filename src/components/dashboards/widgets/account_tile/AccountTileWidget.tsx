'use client';

// account_tile: one account at a glance — name and type icon, the balance as
// the account page heads it (a card's amount owed shown positive, or "In
// credit"), and a 30-day trend line (none for brokers). The balance opens the
// account's net-worth breakdown. Built to read at quarter width.

import { AlertCircle, Wallet } from 'lucide-react';
import { useState } from 'react';

import { headline, TYPE_ICON, TYPE_LABEL } from '@/components/account-detail/AccountHeader';
import { Sparkline } from '@/components/charts/Sparkline';
import { SubtitleText } from '@/components/dashboards/builtins/BuiltinSubtitle';
import { WidgetMessage, WidgetSkeleton } from '@/components/dashboards/WidgetStates';
import { LazyRowBreakdownDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Account } from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAccount, useAccounts } from '@/lib/query/hooks/useAccounts';
import { useBalanceSeries } from '@/lib/query/hooks/useBalanceSeries';
import { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

import { DrillValue, WidgetNote } from '../cards_spending_kit/kit';

export const ACCOUNT_TILE_DAYS = 30;

export interface AccountTileWidgetProps {
  accountId: string | null;
  className?: string;
}

/** The trend as the headline reads it: a card's owed amount goes up as it is spent on. */
export function trendValues(account: Pick<Account, 'type'>, balances: readonly number[]): number[] {
  return account.type === AccountType.CREDIT_CARD ? balances.map((b) => -b) : [...balances];
}

function Trend({ account }: { account: Account }) {
  const { data, isLoading } = useBalanceSeries(account.id, ACCOUNT_TILE_DAYS);
  if (isLoading) return <Skeleton className="h-8 w-full rounded-md" />;
  const values = trendValues(account, (data ?? []).map((p) => p.balance));
  if (values.length < 2) return null;
  return (
    <Sparkline
      values={values}
      className="text-emerald-500 dark:text-emerald-400"
      label={`${account.name}, last ${ACCOUNT_TILE_DAYS} days`}
    />
  );
}

export function AccountTileWidget({ accountId, className }: AccountTileWidgetProps) {
  const { data: account, isLoading, error } = useAccount(accountId ?? '');
  const [open, setOpen] = useState(false);

  let body;
  if (!accountId) {
    body = <WidgetNote>Pick an account in Widget settings.</WidgetNote>;
  } else if (isLoading && !account) {
    body = <WidgetSkeleton kind="kpi" />;
  } else if (error || !account) {
    body =
      !account && (!error || (error instanceof ApiError && error.status === 404)) ? (
        <WidgetMessage icon={Wallet} message="This account no longer exists." />
      ) : (
        <WidgetMessage icon={AlertCircle} tone="danger" message={getErrorMessage(error, 'Failed to load the account')} />
      );
  } else {
    const { label, value } = headline(account);
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-4 pb-3" data-testid="account-tile">
        <div className="flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span aria-hidden="true" className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
            {TYPE_ICON[account.type] ?? <Wallet />}
          </span>
          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{account.name}</span>
        </div>
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <DrillValue
            onClick={() => setOpen(true)}
            label={`view ${account.name} balance breakdown`}
            className="block truncate text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white"
          >
            {value}
          </DrillValue>
        </div>
        {account.type !== AccountType.BROKER && <Trend account={account} />}
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)} data-testid="account-tile-widget">
      {body}
      {open && account && (
        <LazyRowBreakdownDialog
          datasource="net_worth"
          rowId={account.id}
          title={account.name}
          open
          onOpenChange={setOpen}
        />
      )}
    </div>
  );
}

/** The tile's subtitle: the account's type ("Bank account", "Credit card"…); "Account" until the list loads. */
export function AccountTypeSubtitle({ accountId }: { accountId: string }) {
  const { data: accounts } = useAccounts();
  const type = accounts?.find((a) => a.id === accountId)?.type;
  return <SubtitleText>{(type && TYPE_LABEL[type]) || 'Account'}</SubtitleText>;
}
