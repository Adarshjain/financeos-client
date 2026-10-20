'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { Badge, Banner, Button, createDataTableColumnHelper, DataTable, Text } from '@/components/ds';
import { dayMonth } from '@/features/jobs/format';
import type { DuplicateDetail, FileIngestionResult, FileSummary } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

import { SyncCounters } from '../SyncCounters';
import { ResultSection } from './ResultSection';

const dupCh = createDataTableColumnHelper<DuplicateDetail>();
const dupColumns = [
  dupCh.display({
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {dayMonth(row.original.date)}
      </Text>
    ),
  }),
  dupCh.display({
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body" truncate>
        {row.original.description}
      </Text>
    ),
  }),
  dupCh.display({
    id: 'file',
    header: 'File',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3" truncate>
        {row.original.filename}
      </Text>
    ),
  }),
  dupCh.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'status' },
    cell: ({ row }) => <Text variant="body">{formatCurrency(row.original.amount)}</Text>,
  }),
];

const STATUS_TONE = { SUCCESS: 'success', SKIPPED: 'warning', FAILED: 'danger' } as const;

const fileCh = createDataTableColumnHelper<FileSummary>();
const fileColumns = [
  fileCh.display({
    id: 'filename',
    header: 'Filename',
    meta: { size: 'fill', wrap: true, phone: 'main' },
    cell: ({ row }) => {
      const f = row.original;
      return (
        <div className="flex flex-col min-w-0">
          <Text variant="body" truncate>
            {f.filename}
          </Text>
          {f.errorMessage ? (
            <Text variant="caption" tone={f.status === 'FAILED' ? 'danger' : 'ink-3'}>
              {f.errorMessage}
            </Text>
          ) : null}
          {f.warning ? (
            <Text variant="caption" tone="warning">
              {f.warning}
            </Text>
          ) : null}
        </div>
      );
    },
  }),
  fileCh.display({
    id: 'status',
    header: 'Status',
    meta: { size: 'sm', phone: 'status' },
    cell: ({ row }) => <Badge tone={STATUS_TONE[row.original.status] ?? 'danger'}>{row.original.status}</Badge>,
  }),
  fileCh.display({
    id: 'created',
    header: 'Created',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.created ?? '—'}</Text>,
  }),
  fileCh.display({
    id: 'duplicates',
    header: 'Dups',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.duplicates ?? '—'}</Text>,
  }),
  fileCh.display({
    id: 'lines',
    header: 'Lines',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.linesParsed}</Text>,
  }),
];

/** Statement ingest result: counters, duplicates, files that need a look, and every file's outcome. */
export function IngestionResult({ result }: { result: FileIngestionResult }) {
  const files = useMemo(() => result.fileDetails ?? [], [result.fileDetails]);
  const duplicates = useMemo(() => result.duplicateDetails ?? [], [result.duplicateDetails]);
  const warned = files.filter((f) => f.warning);

  return (
    <div className="flex flex-col gap-space-8" data-testid="ingestion-result">
      <Text variant="body-strong" as="p">
        Statement extraction summary
      </Text>

      <SyncCounters
        desktopColumns={3}
        counters={[
          { label: 'Files', value: result.filesProcessed },
          { label: 'Created', value: result.totalCreated },
          { label: 'Duplicates', value: result.totalDuplicatesFound, tone: result.totalDuplicatesFound > 0 ? 'warning' : 'ink' },
        ]}
      />

      {result.totalDuplicatesFound > 0 ? (
        <Banner tone="warning" title="Duplicates detected">
          We found {result.totalDuplicatesFound} duplicate transaction(s). Markings applied as NEEDS_REVIEW. Visit{' '}
          <Button asChild variant="link">
            <Link href="/transactions">Transactions page</Link>
          </Button>{' '}
          to resolve.
        </Banner>
      ) : null}

      <ResultSection title="Duplicate items" count={duplicates.length}>
        <DataTable
          columns={dupColumns}
          data={duplicates}
          getRowId={(d) => d.transactionId}
          phoneSub={(d) => `${dayMonth(d.date)} · ${d.filename}`}
          stickyHeader={false}
        />
        {result.duplicatesTruncated ? (
          <Text variant="caption" tone="ink-3" as="p">
            …and {result.duplicatesTruncated} more
          </Text>
        ) : null}
      </ResultSection>

      {warned.length > 0 ? (
        <Banner tone="warning" title={`Check ${warned.length === 1 ? 'this statement' : 'these statements'}`}>
          <span className="flex flex-col gap-space-2">
            {warned.map((f, i) => (
              <span key={i}>
                <strong>{f.filename}:</strong> {f.warning}
              </span>
            ))}
          </span>
        </Banner>
      ) : null}

      <ResultSection title="File details" count={files.length}>
        <DataTable
          columns={fileColumns}
          data={files}
          getRowId={(f) => f.filename}
          phoneSub={(f) => `${f.created ?? '—'} created · ${f.duplicates ?? '—'} dups · ${f.linesParsed} lines`}
          stickyHeader={false}
        />
      </ResultSection>
    </div>
  );
}
