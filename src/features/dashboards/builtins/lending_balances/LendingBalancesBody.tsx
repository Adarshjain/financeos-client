'use client';

// lending_balances: the people with a nonzero balance, biggest first (one server page), each with what they owe
// you / you owe and Settle up. Settle up opens the Settle up sheet for that person; the name opens their page.
// "View all" goes to the Lendings page when more people have balances. Content only; the frame draws the card.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, EmptyState, ListRow, Skeleton } from '@/components/ds';
import { rupees } from '@/features/investments/investmentsFormat';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { appHref } from '@/features/shell/routes';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { useOutstandingCounterparties } from '@/lib/query/hooks/useCounterparties';

import { BodyError, LazySettleDialog } from '../investmentsLoansParts';
import { LENDING_BALANCES_TOP } from './lendingBalances';

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
  const router = useRouter();
  const [settling, setSettling] = React.useState<CounterpartyResponse | null>(null);
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
        action={{ label: 'Go to lendings', variant: 'link', onSelect: () => router.push(appHref('/loans/lendings')) }}
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
                  <>
                    <Button variant="link" onClick={() => setOpened(p)}>
                      {rupees(Math.abs(p.netPosition))}
                    </Button>
                    <Button size="sm" aria-label={`Settle up with ${p.name}`} onClick={() => setSettling(p)}>
                      Settle up
                    </Button>
                  </>
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
      {settling && (
        <LazySettleDialog
          open
          onOpenChange={(o) => !o && setSettling(null)}
          counterpartyId={settling.id}
          name={settling.name}
          direction={settling.netPosition > 0 ? 'lent' : 'borrowed'}
          balance={Math.abs(settling.netPosition)}
        />
      )}
    </div>
  );
}
