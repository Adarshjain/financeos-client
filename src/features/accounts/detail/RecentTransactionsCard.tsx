'use client';

import React from 'react';

import { Card, DataTable, EmptyState } from '@/components/ds';
import { transactionColumns,TransactionRow, type TransactionRowData } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';
import { ListTransition, RowTransition } from '@/lib/viewTransition';

import type { TransactionRowModel } from './overview/cardOverviewModel';
import { HeaderLink } from './overview/HeaderLink';

/** The model as the Transactions list's row data: the same columns and TransactionRow draw it. */
function asRowData(row: TransactionRowModel): TransactionRowData {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    category: row.category ?? undefined,
    amount: row.amount,
    formattedAmount: row.amount,
    isCredit: row.credit,
    balance: row.balanceLabel ?? undefined,
  };
}

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
  const data = React.useMemo(() => rows.map(asRowData), [rows]);
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
          columns={transactionColumns}
          data={data}
          getRowId={(row) => row.id}
          wrapRow={(row, node) => <RowTransition key={row.id}>{node}</RowTransition>}
          dayHeader={(row) => ({ key: row.date, label: row.date, sublabel: '' })}
          renderRow={(row) => (
            <TransactionRow
              key={row.id}
              date={row.date}
              description={row.description}
              amount={row.formattedAmount}
              isCredit={row.isCredit}
              balance={row.balance}
              categories={row.category ? [row.category] : undefined}
            />
          )}
          empty={<EmptyState compact description="No transactions yet" />}
        />
      </ListTransition>
    </Card>
  );
}
