'use client';

import React from 'react';

import { Badge, Button, Card, createDataTableColumnHelper, DataTable, EmptyState, Text } from '@/components/ds';
import type { GmailSenderResponse } from '@/lib/api/types';

import { senderTitle } from './connectionsModel';

interface SendersCardProps {
  senders: GmailSenderResponse[];
  onOpenAddSender: () => void;
  onOpenEditSender: (sender: GmailSenderResponse) => void;
}

const ch = createDataTableColumnHelper<GmailSenderResponse>();

function makeColumns(onEdit: (sender: GmailSenderResponse) => void) {
  return [
    ch.display({
      id: 'sender',
      header: 'Sender',
      meta: { size: 'fill', grow: 2, phone: 'main' },
      cell: ({ row }) => (
        <Text variant="body" truncate>
          {senderTitle(row.original)}
        </Text>
      ),
    }),
    ch.display({
      id: 'address',
      header: 'Address',
      meta: { size: 'fill', grow: 2, phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-2" truncate>
          {row.original.senderAddress}
        </Text>
      ),
    }),
    ch.display({
      id: 'status',
      header: 'Status',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => (
        <Badge tone={row.original.enabled ? 'success' : 'neutral'}>{row.original.enabled ? 'On' : 'Off'}</Badge>
      ),
    }),
    ch.display({
      id: 'edit',
      header: '',
      meta: { size: 'xs', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="label" as="span">
          <Button variant="link" size="sm" onClick={() => onEdit(row.original)}>
            Edit
          </Button>
        </Text>
      ),
    }),
  ];
}

/** The Gmail sender allowlist: who the app reads mail from. */
export function SendersCard({ senders, onOpenAddSender, onOpenEditSender }: SendersCardProps) {
  const columns = React.useMemo(() => makeColumns(onOpenEditSender), [onOpenEditSender]);

  return (
    <Card
      title="Allowed senders"
      subtitle="Only mail from these addresses is read"
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" onClick={onOpenAddSender}>
            Add sender
          </Button>
        </Text>
      }
    >
      <DataTable
        columns={columns}
        data={senders}
        getRowId={(s) => s.id}
        onRowSelect={onOpenEditSender}
        phoneSub={(s) => s.senderAddress}
        empty={
          <EmptyState
            size="sm"
            title="No allowed senders configured yet"
            description="Add banks, credit cards, or service alerts to the allowlist."
            action={{ label: 'Configure sender', onSelect: onOpenAddSender, variant: 'secondary' }}
          />
        }
      />
    </Card>
  );
}
