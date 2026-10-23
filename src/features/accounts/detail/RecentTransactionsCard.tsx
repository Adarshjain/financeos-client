'use client';

import React from 'react';

import { Badge, Card, Conceal, createDataTableColumnHelper, DataTable, EmptyState, Text, useConcealed } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { ListTransition, RowTransition } from '@/lib/viewTransition';

import type { TransactionRowModel } from './overview/cardOverviewModel';
import { HeaderLink } from './overview/HeaderLink';

function AmountCell({ amount, credit }: { amount: string; credit?: boolean }) {
  const concealed = useConcealed();
  return (
    <Text variant="body-strong" tone={credit && !concealed ? 'positive' : 'ink'} fraction="small">
      {amount}
    </Text>
  );
}

const ch = createDataTableColumnHelper<TransactionRowModel>();
const columns = [
  ch.display({
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {row.original.date}
      </Text>
    ),
  }),
  ch.display({
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.description}</Text>,
  }),
  ch.display({
    id: 'category',
    header: 'Category',
    meta: { size: 'md', phone: 'status' },
    cell: ({ row }) =>
      row.original.category ? (
        <Badge tone="neutral">{row.original.category}</Badge>
      ) : (
        <Text variant="body" tone="ink-3">
          —
        </Text>
      ),
  }),
  ch.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => <AmountCell amount={row.original.amount} credit={row.original.credit} />,
  }),
  ch.display({
    id: 'balance',
    header: 'Balance',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {row.original.balance ? <Conceal whole placeholder="">{row.original.balance}</Conceal> : '—'}
      </Text>
    ),
  }),
];

export function RecentTransactionsCard({
  accountId,
  rows,
  total,
  title = 'Recent transactions',
}: {
  accountId: string;
  rows: TransactionRowModel[];
  /** All transactions of the account (from the search response). */
  total: number;
  /** "Recent entries" for a wallet. */
  title?: string;
}) {
  return (
    <Card
      title={title}
      subtitle={rows.length > 0 ? `Latest ${rows.length} of ${total}` : undefined}
      action={
        <HeaderLink href={appHref(`/transactions?account=${accountId}&period=all_time`)} chevron>
          View all
        </HeaderLink>
      }
    >
      <ListTransition>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          wrapRow={(row, node) => <RowTransition key={row.id}>{node}</RowTransition>}
          phoneSub={(row) => (row.balance ? `${row.date} · bal ₹${row.balance}` : row.date)}
          empty={<EmptyState compact description="No transactions yet" />}
        />
      </ListTransition>
    </Card>
  );
}
