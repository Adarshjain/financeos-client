'use client';

import React from 'react';

import {
  Badge,
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Icon,
  Pager,
  Text,
} from '@/components/ds';

import { LEDGER_SIZE_OPTIONS, type LedgerRow } from './personModel';

const ch = createDataTableColumnHelper<LedgerRow>();
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

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

/** The person's entries newest first, each with the balance after it. Paged by the server, Pager above and below. */
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
        meta: { size: 'sm', phone: 'hidden' },
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
            {row.original.linked ? <Badge tone="success">Linked</Badge> : null}
            {row.original.settled ? <Badge tone="neutral">Settled</Badge> : null}
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
            <Text variant="body-strong" tone="positive" fraction="small">
              {row.original.received}
            </Text>
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
      ch.display({
        id: 'edit',
        header: '',
        meta: { size: 'xs', align: 'end', phone: 'hidden' },
        // The row itself opens the entry; the button's own press must not also open it a second time.
        cell: ({ row }) => (
          <div onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Edit ${row.original.title}`}
              onClick={() => onOpenEntry(row.original)}
            >
              <Icon name="pencil-simple" size="sm" />
            </Button>
          </div>
        ),
      }),
    ],
    [onOpenEntry],
  );

  const pager = (
    <Pager
      page={page}
      size={size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="entries"
      sizeOptions={LEDGER_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
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
