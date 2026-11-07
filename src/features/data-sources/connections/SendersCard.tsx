'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Switch } from '@/components/ds/Switch/Switch';
import { Text } from '@/components/ds/Text/Text';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import type { GmailSenderResponse } from '@/lib/api/types';

import { senderTitle } from './connectionsModel';
import { groupSenderRows, type SenderRow } from './senderRowsModel';

interface SendersCardProps {
  senders: GmailSenderResponse[];
  onOpenAddSender: () => void;
  onOpenEditSender: (sender: GmailSenderResponse) => void;
  /** Turns one sender on or off (from a bank's sheet). */
  onToggleSender?: (sender: GmailSenderResponse, enabled: boolean) => Promise<boolean | void> | boolean | void;
  /** Deletes one sender (from a bank's sheet), after the confirm; the sheet stays open when it returns false. */
  onRemoveSender?: (id: string) => Promise<boolean | void> | boolean | void;
}

const ch = createDataTableColumnHelper<SenderRow>();

function rowAddress(row: SenderRow): string {
  return row.kind === 'bank' ? row.summary : row.sender.senderAddress;
}

function rowEnabled(row: SenderRow): boolean {
  return row.kind === 'bank' ? row.enabled : row.sender.enabled;
}

function makeColumns(onEdit: (row: SenderRow) => void) {
  return [
    ch.display({
      id: 'sender',
      header: 'Sender',
      meta: { size: 'fill', grow: 2, phone: 'main' },
      cell: ({ row }) =>
        row.original.kind === 'bank' ? (
          <span className="flex min-w-0 items-center gap-space-8">
            <BankLogo bankId={row.original.bankId} name={row.original.bankName} />
            <Text variant="body" truncate>
              {row.original.bankName}
            </Text>
          </span>
        ) : (
          <Text variant="body" truncate>
            {senderTitle(row.original.sender)}
          </Text>
        ),
    }),
    ch.display({
      id: 'address',
      header: 'Address',
      meta: { size: 'fill', grow: 2, phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-2" truncate>
          {rowAddress(row.original)}
        </Text>
      ),
    }),
    ch.display({
      id: 'status',
      header: 'Status',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => (
        <StatusWord tone={rowEnabled(row.original) ? 'success' : 'neutral'}>{rowEnabled(row.original) ? 'On' : 'Off'}</StatusWord>
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

/** The Gmail sender allowlist: who the app reads mail from. Bank senders collapse into one row per bank. */
export function SendersCard({ senders, onOpenAddSender, onOpenEditSender, onToggleSender, onRemoveSender }: SendersCardProps) {
  const [openBankId, setOpenBankId] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<GmailSenderResponse | null>(null);
  const [removeBusy, setRemoveBusy] = React.useState(false);

  const rows = React.useMemo(() => groupSenderRows(senders), [senders]);
  const openRow = openBankId ? rows.find((r) => r.kind === 'bank' && r.bankId === openBankId) : undefined;

  const openRowEntry = React.useCallback(
    (row: SenderRow) => (row.kind === 'bank' ? setOpenBankId(row.bankId) : onOpenEditSender(row.sender)),
    [onOpenEditSender],
  );
  const columns = React.useMemo(() => makeColumns(openRowEntry), [openRowEntry]);

  const confirmRemove = async () => {
    if (!removing || !onRemoveSender) return;
    setRemoveBusy(true);
    try {
      const ok = await onRemoveSender(removing.id);
      if (ok !== false) setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  };

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
        data={rows}
        getRowId={(r) => r.id}
        onRowSelect={openRowEntry}
        phoneSub={rowAddress}
        empty={
          <EmptyState
            size="sm"
            title="No allowed senders yet"
            description="Add banks, credit cards, or service alerts to the allowlist."
            action={{ label: 'Add your first sender', onSelect: onOpenAddSender, variant: 'secondary' }}
          />
        }
      />

      <Dialog
        open={openRow?.kind === 'bank'}
        onOpenChange={(next) => {
          if (!next && !removing) setOpenBankId(null);
        }}
      >
        <Dialog.Content
          size="sm"
          title={openRow?.kind === 'bank' ? openRow.bankName : ''}
          secondary={{ label: 'Done', onSelect: () => setOpenBankId(null) }}
        >
          <Dialog.Body>
            {openRow?.kind === 'bank'
              ? openRow.senders.map((s) => (
                  <ListRow
                    key={s.id}
                    flush
                    title={s.senderAddress}
                    trailing={
                      <span className="flex items-center gap-space-12">
                        <Switch
                          checked={s.enabled}
                          aria-label={`Read mail from ${s.senderAddress}`}
                          onCheckedChange={(next) => void onToggleSender?.(s, next)}
                        />
                        <Text variant="label" as="span">
                          <Button variant="danger-link" size="sm" onClick={() => setRemoving(s)}>
                            Remove
                          </Button>
                        </Text>
                      </span>
                    }
                  />
                ))
              : null}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next && !removeBusy) setRemoving(null);
        }}
        title="Remove address?"
        description={`Mail from ${removing?.senderAddress ?? 'this address'} is no longer read, and it won't be added back automatically. Transactions already imported stay.`}
        confirmLabel="Remove"
        confirmLoading={removeBusy}
        onConfirm={confirmRemove}
      />
    </Card>
  );
}
