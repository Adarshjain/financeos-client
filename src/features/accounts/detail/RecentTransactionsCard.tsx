'use client';

import React from 'react';

import { Card, Conceal, createDataTableColumnHelper, DataTable, EmptyState, Text, useConcealed } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { ListTransition, RowTransition } from '@/lib/viewTransition';

import type { TransactionRowModel } from './overview/cardOverviewModel';
import { HeaderLink } from './overview/HeaderLink';

type Row = TransactionRowModel;

const col = createDataTableColumnHelper<Row>();

/** Amount cell: a credit is green only while amounts show. */
function AmountCell({ row }: { row: Row }) {
  const concealed = useConcealed();
  return (
    <Text variant="body" tone={row.credit && !concealed ? 'positive' : 'ink'} fraction="small">
      {row.amount}
    </Text>
  );
}

/** Date, description, category, amount, balance: no Account column (the page is the account); "—" for a missing value. */
const columns = [
  col.display({ id: 'date', header: 'Date', meta: { size: 'date', phone: 'hidden' }, cell: ({ row }) => row.original.date }),
  col.display({
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', wrap: true, phone: 'main' },
    cell: ({ row }) => row.original.description,
  }),
  col.display({
    id: 'category',
    header: 'Category',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) => row.original.category ?? '—',
  }),
  col.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => <AmountCell row={row.original} />,
  }),
  col.display({
    id: 'balance',
    header: 'Balance',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) =>
      row.original.balanceLabel ? <Conceal whole placeholder="">{row.original.balanceLabel}</Conceal> : '—',
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
        <HeaderLink href={appHref(`/transactions?account=${accountId}&period=all_time`)}>
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
          dayHeader={(row) => ({ key: row.date, label: row.date, sublabel: '' })}
          phoneSub={(row) => row.category ?? '—'}
          empty={<EmptyState compact description="No transactions yet" />}
        />
      </ListTransition>
    </Card>
  );
}
