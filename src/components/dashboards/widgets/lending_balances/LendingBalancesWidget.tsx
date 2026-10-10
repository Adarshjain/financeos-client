'use client';

// lending_balances: the people with a nonzero balance, biggest first (one
// server page), each with what they owe you / you owe and Settle up. Settle
// up lazy-loads the Record lending dialog preset to clear the balance; the
// amount opens that person's net-worth breakdown. "View all" goes to the
// Lendings page when more people have balances.

import { ChevronRight, HandCoins, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LazyRowBreakdownDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { useActionLauncher } from '@/components/shortcuts/actions';
import { Button } from '@/components/ui/button';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { settleUpEntry } from '@/lib/lendingEntry';
import { useOutstandingCounterparties } from '@/lib/query/hooks/useCounterparties';
import { cn } from '@/lib/utils';

import {
  DrillValue,
  rupees,
  WidgetBody,
  WidgetEmpty,
  WidgetLoadError,
  WidgetLoadingRows,
} from '../investmentsLoansKit/kit';

/** People the widget lists before "View all". */
export const LENDING_BALANCES_TOP = 5;

const ACTION = 'record-lending';

export function LendingBalancesWidget({ className }: { className?: string }) {
  const { data, isLoading, error } = useOutstandingCounterparties(LENDING_BALANCES_TOP);
  const launcher = useActionLauncher();
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [opened, setOpened] = useState<CounterpartyResponse | null>(null);
  const people = data?.content ?? [];
  const more = (data?.totalElements ?? 0) > people.length;

  const settleUp = async (person: CounterpartyResponse) => {
    const entry = settleUpEntry(person.netPosition);
    if (!entry) return;
    setLaunchingId(person.id);
    try {
      await launcher.launch(ACTION, { counterparty: person, ...entry });
    } finally {
      setLaunchingId(null);
    }
  };

  let body;
  if (isLoading) body = <WidgetLoadingRows testId="lending-balances-loading" />;
  else if (error) body = <WidgetLoadError what="lending balances" error={error} />;
  else if (people.length === 0) {
    body = (
      <WidgetEmpty
        icon={HandCoins}
        title="All square"
        description="Nobody owes you and you owe nobody."
        action={
          <Button asChild variant="link" size="xs">
            <Link href="/loans/lendings">Go to lendings</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800" aria-label="Balances">
        {people.map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            loading={launchingId === p.id && launcher.pendingId === ACTION}
            onOpen={() => setOpened(p)}
            onSettle={() => void settleUp(p)}
            onPrefetch={() => launcher.prefetch(ACTION)}
          />
        ))}
      </ul>
    );
  }

  return (
    <WidgetBody className={className} testId="lending-balances-widget">
      {body}
      {more && !error && (
        <Link
          href="/loans/lendings"
          className="flex shrink-0 items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs font-medium text-emerald-700 hover:bg-slate-50 dark:border-slate-800 dark:text-emerald-400 dark:hover:bg-slate-800/50"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {launcher.dialog}
      {opened && (
        <LazyRowBreakdownDialog
          datasource="net_worth"
          rowId={opened.id}
          title={opened.name}
          open
          onOpenChange={(o) => !o && setOpened(null)}
        />
      )}
    </WidgetBody>
  );
}

function PersonRow({
  person,
  loading,
  onOpen,
  onSettle,
  onPrefetch,
}: {
  person: CounterpartyResponse;
  loading: boolean;
  onOpen: () => void;
  onSettle: () => void;
  onPrefetch: () => void;
}) {
  const owesYou = person.netPosition > 0;
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-200">{person.name}</span>
        <span className="block text-2xs text-slate-500 dark:text-slate-400">{owesYou ? 'Owes you' : 'You owe'}</span>
      </span>
      <DrillValue
        onClick={onOpen}
        label={`view breakdown of ${person.name}`}
        className={cn(
          'shrink-0 text-xs font-semibold',
          owesYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white',
        )}
      >
        {rupees(Math.abs(person.netPosition))}
      </DrillValue>
      <Button
        type="button"
        variant="outline"
        size="micro"
        className="shrink-0"
        onClick={onSettle}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
        onTouchStart={onPrefetch}
        disabled={loading}
        aria-label={`Settle up with ${person.name}`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
        Settle up
      </Button>
    </li>
  );
}
