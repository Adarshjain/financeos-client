'use client';

import React from 'react';

import {
  Badge,
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Text,
} from '@/components/ds';

import type { TransactionRowModel } from './cardOverviewModel';
import { HeaderLink } from './HeaderLink';

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
    meta: { size: 'lg', phone: 'status' },
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
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong" tone={row.original.credit ? 'positive' : 'ink'}>
        {row.original.amount}
      </Text>
    ),
  }),
  ch.display({
    id: 'balance',
    header: 'Balance',
    meta: { size: 'md', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {row.original.balance ?? '—'}
      </Text>
    ),
  }),
];

export function RecentTransactionsCard({
  accountId,
  rows,
  total,
}: {
  accountId: string;
  rows: TransactionRowModel[];
  /** All transactions of the account (from the search response). */
  total: number;
}) {
  return (
    <Card
      title="Recent transactions"
      subtitle={rows.length > 0 ? `Latest ${rows.length} of ${total}` : undefined}
      action={
        <HeaderLink href={`/transactions?account=${accountId}`} chevron>
          View all
        </HeaderLink>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        phoneSub={(row) => row.date}
        empty={<EmptyState compact description="No transactions yet" />}
      />
    </Card>
  );
}
