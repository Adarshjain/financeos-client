'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Banner, Card, EmptyState } from '@/components/ds';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';
import { InboxBillHost } from '@/features/inbox/InboxBillHost';
import { SettleDialog } from '@/features/lendings/SettleDialog';
import { todayInAppZone } from '@/lib/date-range';
import { useObligations } from '@/lib/query/hooks/useObligations';

import type { ObligationItem, ObligationKindFilter } from './obligations';
import { UpcomingFilters } from './UpcomingFilters';
import { UpcomingList } from './UpcomingList';
import {
  buildTiles,
  monthsLabel,
  parseKind,
  parseMonths,
  upcomingSearch,
} from './upcomingModel';
import { UpcomingSkeleton } from './UpcomingSkeleton';
import { UpcomingTotals } from './UpcomingTotals';
import { useUrlState } from './useUrlState';

/**
 * The Upcoming list tab of /upcoming. Kind and range live in the URL (`?kind=`, `?months=`);
 * the kind filters the loaded rows in place, the range refetches. `?bill=<statementId>` outlines
 * and scrolls to that card bill.
 */
export function UpcomingView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const billParam = searchParams.get('bill');
  const [{ kind, months }, setState] = useUrlState(searchParams.toString(), (search) => {
    const params = new URLSearchParams(search);
    return { kind: parseKind(params.get('kind')), months: parseMonths(params.get('months')) };
  });
  const [paying, setPaying] = React.useState<{ item: ObligationItem; open: boolean } | null>(null);
  const [settling, setSettling] = React.useState<{ item: ObligationItem; open: boolean } | null>(null);
  const [detailsFor, setDetailsFor] = React.useState<string | null>(null);
  const today = todayInAppZone();

  const { data, error, isFetched, isPending, refetch } = useObligations(months);
  const items = React.useMemo(
    () => (data ?? []).filter((i) => kind === 'all' || i.type === kind),
    [data, kind],
  );
  const tiles = React.useMemo(() => buildTiles(items, today), [items, today]);

  React.useEffect(() => {
    if (!billParam || !isFetched) return;
    const el = document.querySelector(`[data-bill-row="${CSS.escape(billParam)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [billParam, isFetched, months, kind]);

  const syncUrl = (next: { kind: ObligationKindFilter; months: number }) => {
    const search = upcomingSearch(window.location.search, next);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}`);
  };
  const changeKind = (next: ObligationKindFilter) => {
    setState({ kind: next, months });
    syncUrl({ kind: next, months });
  };
  const changeMonths = (next: number) => {
    setState({ kind, months: next });
    syncUrl({ kind, months: next });
  };

  const failed = Boolean(error) && !data;
  const retry = { label: 'Try again', onSelect: () => void refetch() };

  let body: React.ReactNode;
  if (isPending && !failed) {
    body = <UpcomingSkeleton />;
  } else {
    body = (
      <>
        <UpcomingTotals tiles={tiles} />
        <UpcomingFilters
          kind={kind}
          months={months}
          onKindChange={changeKind}
          onMonthsChange={changeMonths}
        />
        {error ? (
          <Banner tone="danger" action={retry}>
            Failed to load upcoming items.
          </Banner>
        ) : null}
        {failed ? null : items.length === 0 ? (
          <Card>
            <EmptyState
              size="sm"
              description={
                kind === 'all'
                  ? `Nothing scheduled within the next ${monthsLabel(months)}.`
                  : `Nothing of this kind within the next ${monthsLabel(months)}.`
              }
              action={
                kind === 'all'
                  ? undefined
                  : { label: 'Clear filters', variant: 'secondary', onSelect: () => changeKind('all') }
              }
            />
          </Card>
        ) : (
          <UpcomingList
            items={items}
            today={today}
            highlightStatementId={billParam}
            onMarkPaid={(item) => setPaying({ item, open: true })}
            onSettle={(item) => setSettling({ item, open: true })}
            onSetDetails={(item) => setDetailsFor(item.statementId ?? null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {body}
      {paying?.item.statementId ? (
        <MarkPaidDialog
          open={paying.open}
          onOpenChange={(open) => setPaying((p) => (p ? { ...p, open } : p))}
          statementId={paying.item.statementId}
          cardName={paying.item.accountName ?? paying.item.title ?? 'Card'}
          remaining={paying.item.amount ?? null}
        />
      ) : null}
      {detailsFor ? (
        <InboxBillHost
          pending={{ type: 'set_details', statementId: detailsFor }}
          onClose={() => setDetailsFor(null)}
        />
      ) : null}
      {settling?.item.counterpartyId ? (
        <SettleDialog
          open={settling.open}
          onOpenChange={(open) => setSettling((s) => (s ? { ...s, open } : s))}
          counterpartyId={settling.item.counterpartyId}
          name={settling.item.counterpartyName ?? ''}
          direction={settling.item.direction === 'borrowed' ? 'borrowed' : 'lent'}
          balance={settling.item.amount ?? 0}
          onRecorded={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
