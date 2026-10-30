'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Pager } from '@/components/ds/Pager/Pager';
import { Select } from '@/components/ds/Select/Select';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { useSearchText } from '@/features/shell/useSearchText';
import { RowTransition, SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import {
  LENDING_FILTERS,
  type LendingFilter,
  type LendingRow,
  lendingsUrl,
  type LendingsUrlState,
} from './lendingsListModel';

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
    cell: ({ row }) => <StatusWord tone={row.original.directionTone}>{row.original.directionLabel}</StatusWord>,
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
];

export interface LendingsListCardProps {
  state: LendingsUrlState;
  rows: LendingRow[];
  totalElements: number;
  totalPages: number;
}

/** Search, the direction dropdown, and the people table with its Pager. All of it is server-side. */
export function LendingsListCard({ state, rows, totalElements, totalPages }: LendingsListCardProps) {
  const router = useRouter();
  const addLending = useAddLending();
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
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar
        search={{ value: text, onValueChange: setText }}
        changed={filtered}
        onReset={() => go({ q: '', filter: 'all', page: 0 })}
      >
        <Select
          value={state.filter}
          options={LENDING_FILTERS}
          onValueChange={(v) => go({ filter: v as LendingFilter, page: 0 })}
          trigger={
            <FilterChip
              className="shrink-0"
              hasDropdown
              changed={state.filter !== 'all'}
              onReset={() => go({ filter: 'all', page: 0 })}
            >
              {state.filter === 'all' ? 'Direction' : (LENDING_FILTERS.find((f) => f.value === state.filter)?.label ?? 'Direction')}
            </FilterChip>
          }
        />
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
            filtered ? (
              <EmptyState
                title="No people match"
                description="Try another name or direction."
                action={{ label: 'Clear filters', variant: 'secondary', onSelect: () => go({ q: '', filter: 'all', page: 0 }) }}
              />
            ) : (
              <EmptyState
                title="No lendings yet"
                description="Add a lending to start a ledger."
                action={{ label: 'Add lending', variant: 'primary', onSelect: () => void addLending.open() }}
              />
            )
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
