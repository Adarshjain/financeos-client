'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { ObligationGroups } from '@/components/obligations/ObligationGroups';
import type { ObligationKindFilter } from '@/components/obligations/types';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarGrid } from '@/components/upcoming/CalendarGrid';
import { MarkPaidHost } from '@/components/upcoming/MarkPaidHost';
import { TotalsStrip } from '@/components/upcoming/TotalsStrip';
import { UpcomingControls } from '@/components/upcoming/UpcomingControls';
import { todayInAppZone } from '@/lib/date-range';
import { useObligations } from '@/lib/query/hooks/useObligations';

export function UpcomingView() {
  const billParam = useSearchParams().get('bill');
  const [months, setMonths] = useState(3);
  const [kind, setKind] = useState<ObligationKindFilter>('all');
  const [view, setView] = useState('list');
  const [payingId, setPayingId] = useState<string | null>(null);
  const today = todayInAppZone();

  const { data, error, isFetched } = useObligations(months);
  const items = useMemo(
    () => (data ?? []).filter((i) => kind === 'all' || i.type === kind),
    [data, kind]
  );

  useEffect(() => {
    if (!billParam || !isFetched) return;
    const el = document.querySelector(`[data-bill-row="${CSS.escape(billParam)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [billParam, isFetched, months, kind]);

  const controls = (
    <UpcomingControls months={months} onMonths={setMonths} kind={kind} onKind={setKind} />
  );
  const rowProps = { highlightStatementId: billParam, onMarkPaid: setPayingId };

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-3 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Upcoming
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Card bills, EMIs, lending returns and expected statements, whether or not they need action
        </p>
      </div>

      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {controls}
      </Card>
      <PageActionBar>{controls}</PageActionBar>

      {error && (
        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 text-xs text-rose-600 dark:text-rose-400">
          Failed to load upcoming items. Please try again.
        </div>
      )}

      <TotalsStrip items={items} today={today} />

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
      </Tabs>
      <div>
        {view === 'list' ? (
          <ObligationGroups items={items} months={months} today={today} {...rowProps} />
        ) : (
          <CalendarGrid items={items} today={today} {...rowProps} />
        )}
      </div>

      <MarkPaidHost statementId={payingId} onClose={() => setPayingId(null)} />
    </div>
  );
}
