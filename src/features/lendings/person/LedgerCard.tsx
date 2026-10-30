'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { useConcealed } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Pager } from '@/components/ds/Pager/Pager';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';

import type { LedgerRow } from './personModel';

const ch = createDataTableColumnHelper<LedgerRow>();

function ReceivedCell({ children }: { children: string }) {
  const concealed = useConcealed();
  return (
    <Text variant="body-strong" tone={concealed ? 'ink' : 'positive'} fraction="small">
      {children}
    </Text>
  );
}

export interface LedgerCardProps {
  /** The person's first name, for the subtitle and the empty state. */
  firstName: string;
  rows: LedgerRow[];
  /** "Opening ₹0 · lent ₹26,800 · received ₹11,800 · closing ₹15,000" */
  totals: string;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  onOpenEntry: (row: LedgerRow) => void;
  /** "Export as text" at the end of the totals line: opens Export ledger. */
  onExport: () => void;
}

/** The person's entries newest first, each with the balance after it. Paged by the server. */
export function LedgerCard({
  firstName,
  rows,
  totals,
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  onOpenEntry,
  onExport,
}: LedgerCardProps) {
  const columns = React.useMemo(
    () => [
      ch.display({
        id: 'date',
        header: 'Date',
        meta: { size: 'date', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3">
            {row.original.date}
          </Text>
        ),
      }),
      ch.display({
        id: 'entry',
        header: 'Entry',
        meta: { size: 'fill', grow: 1.4, phone: 'main', wrap: true },
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-x-space-8 gap-y-space-4">
            <Text variant="body-strong" as="span">
              {row.original.title}
            </Text>
            {row.original.linked ? <StatusWord tone="success">Linked</StatusWord> : null}
            {row.original.settled ? <StatusWord tone="success">Settled</StatusWord> : null}
          </span>
        ),
      }),
      ch.display({
        id: 'lent',
        header: 'Lent',
        meta: { size: 'sm', align: 'end', phone: 'hidden' },
        cell: ({ row }) =>
          row.original.lent ? (
            <Text variant="body-strong" fraction="small">{row.original.lent}</Text>
          ) : (
            <Text variant="body" tone="ink-3">
              —
            </Text>
          ),
      }),
      ch.display({
        id: 'received',
        header: 'Received',
        meta: { size: 'sm', align: 'end', phone: 'hidden' },
        cell: ({ row }) =>
          row.original.received ? (
            <ReceivedCell>{row.original.received}</ReceivedCell>
          ) : (
            <Text variant="body" tone="ink-3">
              —
            </Text>
          ),
      }),
      ch.display({
        id: 'balance',
        header: 'Balance',
        meta: { size: 'sm', align: 'end', phone: 'amount' },
        cell: ({ row }) => <Text variant="body-strong" fraction="small">{row.original.balance}</Text>,
      }),
    ],
    [],
  );

  const pager = (
    <Pager
      page={page}
      size={size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="entries"
      onPageChange={onPageChange}
      onSizeChange={onSizeChange}
    />
  );

  return (
    <Card title="Ledger" subtitle={`Running balance · positive means ${firstName} owes you`}>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        pager={pager}
        phoneSub={(row) => row.sub}
        onRowSelect={onOpenEntry}
        footer={
          rows.length > 0 ? (
            <div className="flex flex-col items-start gap-space-4 px-space-16 py-space-10 desk:flex-row desk:items-center desk:justify-between desk:gap-space-12">
              <Text variant="caption" tone="ink-3" as="p">
                {totals}
              </Text>
              <Text variant="label" as="span">
                <Button variant="link" size="sm" onClick={onExport}>
                  Export as text
                </Button>
              </Text>
            </div>
          ) : undefined
        }
        empty={<EmptyState compact description={`No ledger entries recorded for ${firstName}.`} />}
        stickyHeader={false}
      />
    </Card>
  );
}
