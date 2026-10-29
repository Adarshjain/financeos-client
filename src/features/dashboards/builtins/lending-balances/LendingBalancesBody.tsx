'use client';

// lending_balances: the people with a nonzero balance, biggest first (one server page), each with what they owe
// you / you owe. The amount opens that person's breakdown (no Settle up here; settling happens on Lendings).
// "View all" goes to the Lendings page when more people have balances. Content only; the frame draws the card.

import Link from 'next/link';
import React from 'react';

import { Button, EmptyState, ListRow, Skeleton } from '@/components/ds';
import { BodyError } from '@/features/dashboards/builtins/investmentsLoansParts';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { appHref } from '@/features/shell/routes';
import { formatMoney } from '@/lib/format';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { useOutstandingCounterparties } from '@/lib/query/hooks/useCounterparties';

import { LENDING_BALANCES_TOP } from './lendingBalancesModel';

/** The widget's loading skeleton: three people, each a name over a line and a figure. */
export function LendingBalancesSkeleton() {
  return (
    <div data-testid="lending-balances-loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-space-12 px-space-16 py-space-10">
          <div className="flex min-w-0 flex-1 flex-col gap-space-4">
            <Skeleton width="40%" />
            <Skeleton width="20%" />
          </div>
          <Skeleton width={56} />
        </div>
      ))}
    </div>
  );
}

export function LendingBalancesBody() {
  const { data, isLoading, error, refetch } = useOutstandingCounterparties(LENDING_BALANCES_TOP);
  const [opened, setOpened] = React.useState<CounterpartyResponse | null>(null);
  const people = data?.content ?? [];
  const more = (data?.totalElements ?? 0) > people.length;

  if (isLoading) return <LendingBalancesSkeleton />;
  if (error) return <BodyError what="lending balances" error={error} retry={() => void refetch()} />;
  if (people.length === 0) {
    return (
      <EmptyState
        compact
        title="All square"
        description="Nobody owes you and you owe nobody."
        action={{ label: 'Go to lendings', variant: 'link', href: appHref('/loans/lendings') }}
      />
    );
  }
  return (
    <div data-testid="lending-balances-widget">
      <div role="list" aria-label="Balances">
        {people.map((p) => {
          const owesYou = p.netPosition > 0;
          return (
            <div key={p.id} role="listitem">
              <ListRow
                title={p.name}
                subtitle={owesYou ? 'Owes you' : 'You owe'}
                trailing={
                  <Button variant="link" onClick={() => setOpened(p)}>
                    {formatMoney(Math.abs(p.netPosition))}
                  </Button>
                }
              />
            </div>
          );
        })}
      </div>
      {more && (
        <div className="px-space-16 py-space-8">
          <Button asChild variant="link">
            <Link href={appHref('/loans/lendings')}>View all</Link>
          </Button>
        </div>
      )}
      {opened ? (
        <LazyReportRowBreakdownDialog datasource="net_worth" rowId={opened.id} title={opened.name} onClose={() => setOpened(null)} />
      ) : null}
    </div>
  );
}
