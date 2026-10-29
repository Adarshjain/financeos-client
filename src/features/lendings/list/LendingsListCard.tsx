'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  Icon,
  Pager,
  Text,
} from '@/components/ds';
import { useSearchText } from '@/features/shell/useSearchText';
import { RowTransition, SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import {
  LENDING_FILTERS,
  type LendingFilter,
  type LendingRow,
  LENDINGS_SIZE_OPTIONS,
  lendingsUrl,
  type LendingsUrlState,
} from './lendingsList';

const ch = createDataTableColumnHelper<LendingRow>();

const columns = [
  ch.display({
    id: 'person',
    header: 'Person',
    meta: { size: 'fill', grow: 1.5, phone: 'main' },
    cell: ({ row }) => (
      <SharedName name={transitionName.person(row.original.id)}>
        <Text variant="body-strong" truncate>
          {row.original.name}
        </Text>
      </SharedName>
    ),
  }),
  ch.display({
    id: 'direction',
    header: 'Direction',
    meta: { size: 'sm', phone: 'status' },
    cell: ({ row }) => <Badge tone={row.original.directionTone}>{row.original.directionLabel}</Badge>,
  }),
  ch.display({
    id: 'balance',
    header: 'Balance',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong" tone={row.original.balanceTone} fraction="small">
        {row.original.balance}
      </Text>
    ),
  }),
  ch.display({
    id: 'expected',
    header: 'Expected',
    meta: { size: 'lg', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone={row.original.hasExpected ? 'ink' : 'ink-3'}>
        {row.original.expected}
      </Text>
    ),
  }),
  ch.display({
    id: 'lastEntry',
    header: 'Last entry',
    meta: { size: 'lg', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3" truncate>
        {row.original.lastEntry ?? '—'}
      </Text>
    ),
  }),
  ch.display({
    id: 'open',
    header: '',
    meta: { size: 'xs', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" iconOnly aria-label={`Open ${row.original.name}`}>
        <Link href={row.original.href} prefetch={false}>
          <Icon name="chevron-right" size="sm" />
        </Link>
      </Button>
    ),
  }),
];

export interface LendingsListCardProps {
  state: LendingsUrlState;
  rows: LendingRow[];
  totalElements: number;
  totalPages: number;
}

/** Search, the direction chips, and the people table with the Pager above and below. All of it is server-side. */
export function LendingsListCard({ state, rows, totalElements, totalPages }: LendingsListCardProps) {
  const router = useRouter();
  // The newest state asked for, so a change made while an earlier push is still travelling (a chip, then
  // a search typed straight after) builds on it instead of on the URL state the page has not caught up to.
  const latest = React.useRef(state);
  React.useEffect(() => {
    latest.current = state;
  }, [state]);
  const go = (next: Partial<LendingsUrlState>) => {
    latest.current = { ...latest.current, ...next };
    router.push(lendingsUrl(latest.current), { scroll: false });
  };
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));
  const filtered = state.q !== '' || state.filter !== 'all';

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="people"
      sizeOptions={LENDINGS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar
        search={{ value: text, onValueChange: setText }}
      >
        {LENDING_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            className="shrink-0"
            selected={state.filter === f.value}
            onClick={() => go({ filter: f.value as LendingFilter, page: 0 })}
          >
            {f.label}
          </FilterChip>
        ))}
      </FilterBar>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          wrapRow={(row, node) => <RowTransition key={row.id}>{node}</RowTransition>}
          pager={pager}
          leading={(row) => (
            <Avatar variant="circle" tone={row.avatarTone} size="sm" initials={row.initials} />
          )}
          phoneSub={(row) => row.phoneSub}
          onRowSelect={(row) => router.push(row.href)}
          empty={
            <EmptyState
              compact
              description={filtered ? 'No people match' : 'No lendings yet. Add a lending to start a ledger.'}
              action={
                filtered
                  ? { label: 'Clear filters', variant: 'link', onSelect: () => go({ q: '', filter: 'all', page: 0 }) }
                  : undefined
              }
            />
          }
          stickyHeader={false}
        />
      </Card>
    </div>
  );
}

/** The people table while the page loads. */
export function LendingsListSkeleton() {
  return (
    <Card>
      <DataTable columns={columns} data={[]} getRowId={(row) => row.id} loading skeletonRows={5} />
    </Card>
  );
}
