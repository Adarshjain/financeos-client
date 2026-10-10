'use client';

// card_utilisation: how much of each open credit card's limit is in use right
// now (live balance ÷ limit, from the server), most utilised first, cards at or
// over 30% flagged, and an overall row when there are several cards. A card's
// owed amount opens its net-worth breakdown.

import { AlertCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { WidgetMessage, WidgetSkeleton } from '@/components/dashboards/WidgetStates';
import { LazyRowBreakdownDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import {
  formatUtilisation,
  UTILISATION_WATCH_PCT,
  utilisationBarWidth,
  utilisationToneClasses,
} from '@/lib/utilisation';
import { cn, formatMoney } from '@/lib/utils';

import { DrillValue, WidgetNote } from '../cards_spending_kit/kit';
import { buildUtilisationModel, type UtilisationRow } from './cardUtilisation.model';

export interface CardUtilisationWidgetProps {
  /** Only this card; every open credit card when absent. */
  accountId?: string | null;
  className?: string;
}

function Bar({ pct }: { pct: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={cn('h-full rounded-full', utilisationToneClasses(pct).bar)}
        style={{ width: utilisationBarWidth(pct) }}
      />
    </div>
  );
}

function Percent({ pct }: { pct: number | null }) {
  return (
    <span
      className={cn(
        'shrink-0 text-xs font-semibold tabular-nums',
        pct == null ? 'text-slate-500 dark:text-slate-400' : utilisationToneClasses(pct).text,
      )}
    >
      {formatUtilisation(pct)}
    </span>
  );
}

function CardRow({ row, onOpen }: { row: UtilisationRow; onOpen: (row: UtilisationRow) => void }) {
  return (
    <li className="space-y-1.5 px-4 py-2.5" data-testid="utilisation-row" data-account-id={row.id}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{row.name}</span>
          {row.flagged && (
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold',
                utilisationToneClasses(row.pct).tone === 'high'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
              )}
            >
              Over {UTILISATION_WATCH_PCT}%
            </span>
          )}
        </div>
        <Percent pct={row.pct} />
      </div>
      <Bar pct={row.pct} />
      <div className="flex flex-wrap items-baseline gap-x-1 text-2xs text-slate-500 dark:text-slate-400">
        <DrillValue
          onClick={() => onOpen(row)}
          label={`view ${row.name} balance breakdown`}
          className="font-semibold tabular-nums text-slate-700 dark:text-slate-200"
        >
          {formatMoney(row.owed)}
        </DrillValue>
        <span>owed</span>
        {row.limit != null ? (
          <span className="tabular-nums">of {formatMoney(row.limit)}</span>
        ) : (
          <span>· no limit set</span>
        )}
      </div>
    </li>
  );
}

export function CardUtilisationWidget({ accountId = null, className }: CardUtilisationWidgetProps) {
  const { data: accounts, isLoading, error } = useAccounts();
  const [open, setOpen] = useState<UtilisationRow | null>(null);
  const today = todayInAppZone();
  const model = useMemo(
    () => buildUtilisationModel(accounts ?? [], accountId, today),
    [accounts, accountId, today],
  );

  let body;
  if (isLoading && !accounts) {
    body = <WidgetSkeleton kind="table" />;
  } else if (error) {
    body = <WidgetMessage icon={AlertCircle} tone="danger" message={getErrorMessage(error, 'Failed to load cards')} />;
  } else if (model.rows.length === 0) {
    body = accountId ? (
      <WidgetNote>This card is closed or no longer exists.</WidgetNote>
    ) : (
      <EmptyState
        compact
        icon={CreditCard}
        title="No open credit cards"
        description="Add a credit card to see how much of its limit you're using."
        className="m-4"
        action={
          <Button asChild variant="link" size="xs">
            <Link href="/accounts">Go to accounts</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        {model.overall && (
          <div
            className="shrink-0 space-y-1.5 border-b border-slate-100 px-4 pb-2.5 pt-1 dark:border-slate-800"
            data-testid="utilisation-overall"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                All cards{' '}
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(model.overall.owed)}
                </span>{' '}
                of <span className="tabular-nums">{formatMoney(model.overall.limit)}</span>
              </span>
              <Percent pct={model.overall.pct} />
            </div>
            <Bar pct={model.overall.pct} />
          </div>
        )}
        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {model.rows.map((row) => (
            <CardRow key={row.id} row={row} onOpen={setOpen} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)} data-testid="card-utilisation-widget">
      {body}
      {open && (
        <LazyRowBreakdownDialog
          datasource="net_worth"
          rowId={open.id}
          title={open.name}
          open
          onOpenChange={(o) => !o && setOpen(null)}
        />
      )}
    </div>
  );
}
