'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

import { Button, createDataTableColumnHelper, DataTable, Icon, Text } from '@/components/ds';
import { dayMonth } from '@/features/jobs/format';
import { formatFromHeader } from '@/features/jobs/gmailSyncModel';
import type { SyncMessageOutcome, SyncSummary } from '@/lib/types';

const ACCOUNTS_HREF = '/ds/accounts';
const IMPORT_HREF = '/transactions/import';

function ActionCell({ outcome }: { outcome: SyncMessageOutcome }) {
  const link = (href: string, label: string) => (
    <Text variant="label" as="span">
      <Button asChild variant="link">
        <Link href={href}>{label}</Link>
      </Button>
    </Text>
  );
  switch (outcome.outcome) {
    case 'ACCOUNT_UNRESOLVED':
      return link(
        ACCOUNTS_HREF,
        outcome.accountLast4 ? `Add or fix account ending ${outcome.accountLast4}` : 'Add or fix account',
      );
    case 'DECRYPT_FAILED':
      return link(ACCOUNTS_HREF, 'Set the statement password on the account');
    case 'PARSE_FAILED':
    case 'NO_ATTACHMENT':
      return link(IMPORT_HREF, 'Import manually');
    default:
      return (
        <Text variant="caption" tone="ink-3">
          Will retry on next sync
        </Text>
      );
  }
}

const ch = createDataTableColumnHelper<SyncMessageOutcome>();

const columns = [
  ch.display({
    id: 'from',
    header: 'From',
    meta: { size: 'md', phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body" truncate>
        {formatFromHeader(row.original.from)}
      </Text>
    ),
  }),
  ch.display({
    id: 'subject',
    header: 'Subject',
    meta: { size: 'fill', grow: 2, wrap: true, phone: 'hidden' },
    cell: ({ row }) => (
      <div className="flex flex-col min-w-0">
        <Text variant="body" truncate>
          {row.original.subject || '—'}
        </Text>
        {row.original.attachmentFilename ? (
          <Text variant="caption" tone="ink-3" truncate>
            {row.original.attachmentFilename}
          </Text>
        ) : null}
      </div>
    ),
  }),
  ch.display({
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {dayMonth(row.original.receivedAt)}
      </Text>
    ),
  }),
  ch.display({
    id: 'problem',
    header: 'Problem',
    meta: { size: 'md', wrap: true, phone: 'status' },
    cell: ({ row }) => (
      <Text variant="body" tone={row.original.outcome === 'ERROR' ? 'danger' : 'ink'}>
        {row.original.reason}
      </Text>
    ),
  }),
  ch.display({
    id: 'action',
    header: 'Action',
    meta: { size: 'lg', wrap: true, phone: 'hidden' },
    cell: ({ row }) => <ActionCell outcome={row.original} />,
  }),
];

/** "Needs attention (n)" for results stored before per-email run detail existed. */
export function SyncAttention({ result }: { result: SyncSummary }) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => result.attention ?? [], [result.attention]);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-space-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          icon={<Icon name={open ? 'chevron-down' : 'chevron-right'} size="xs" />}
        >
          Needs attention ({rows.length})
        </Button>
      </div>
      {open ? (
        <>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(r) => `${r.gmailMessageId ?? ''}-${rows.indexOf(r)}`}
            phoneSub={(r) => `${r.subject || '—'}${r.attachmentFilename ? ` · File: ${r.attachmentFilename}` : ''}`}
            phoneActions={(r) => <ActionCell outcome={r} />}
            stickyHeader={false}
          />
          {result.attentionTruncated ? (
            <Text variant="caption" tone="ink-3" as="p">
              …and {result.attentionTruncated} more
            </Text>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
