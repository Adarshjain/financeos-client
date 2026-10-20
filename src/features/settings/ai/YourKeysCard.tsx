'use client';

import React, { useMemo } from 'react';

import {
  Badge,
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  Icon,
  Menu,
  MenuItem,
  Text,
} from '@/components/ds';
import type { LlmKeyDto } from '@/lib/api/types';

import { buildKeyRows, formatLastUsed, type KeyRow, maskedKey, providerLine } from './aiModel';

const ch = createDataTableColumnHelper<KeyRow>();

interface YourKeysCardProps {
  keys: LlmKeyDto[];
  testingKeyId: string | null;
  onAdd: (providerId?: string) => void;
  onTest: (key: LlmKeyDto) => void;
  onMove: (row: KeyRow, delta: number) => void;
  onDelete: (key: LlmKeyDto) => void;
}

/** One row per key (and a "Not set" row per provider without one), with the key menu. */
export function YourKeysCard({ keys, testingKeyId, onAdd, onTest, onMove, onDelete }: YourKeysCardProps) {
  const rows = useMemo(() => buildKeyRows(keys), [keys]);

  const columns = useMemo(
    () => [
      ch.display({
        id: 'provider',
        header: 'Provider',
        meta: { size: 'fill', phone: 'main' },
        cell: ({ row }) => <Text variant="body-strong">{providerLine(row.original)}</Text>,
      }),
      ch.display({
        id: 'key',
        header: 'Key',
        meta: { size: 'md', phone: 'hidden' },
        cell: ({ row }) =>
          row.original.key ? (
            <Text variant="body" tone="ink-2" mono>
              {maskedKey(row.original.key.keyLast4)}
            </Text>
          ) : (
            <Text variant="body" tone="ink-3">
              —
            </Text>
          ),
      }),
      ch.display({
        id: 'lastUsed',
        header: 'Last used',
        meta: { size: 'md', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3">
            {row.original.key ? formatLastUsed(row.original.key.lastUsedAt) : '—'}
          </Text>
        ),
      }),
      ch.display({
        id: 'status',
        header: 'Status',
        meta: { size: 'sm', phone: 'status' },
        cell: ({ row }) =>
          !row.original.key ? (
            <Badge tone="neutral">Not set</Badge>
          ) : row.original.key.status === 'ACTIVE' ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="danger">Invalid</Badge>
          ),
      }),
      ch.display({
        id: 'actions',
        header: '',
        meta: { size: 'sm', align: 'end', phone: 'amount' },
        cell: ({ row }) => {
          const { key, index, count, provider } = row.original;
          if (!key) {
            return (
              <Text variant="label" as="span">
                <Button variant="link" size="sm" onClick={() => onAdd(provider.id)}>
                  Add
                </Button>
              </Text>
            );
          }
          return (
            <Menu
              align="end"
              trigger={
                <Button variant="secondary" size="sm" iconOnly aria-label={`Key options for ${providerLine(row.original)}`}>
                  <Icon name="more" size="sm" />
                </Button>
              }
            >
              <MenuItem onSelect={() => onTest(key)}>Test key</MenuItem>
              {count > 1 ? (
                <>
                  <MenuItem disabled={index === 0} onSelect={() => onMove(row.original, -1)}>
                    Move up
                  </MenuItem>
                  <MenuItem disabled={index === count - 1} onSelect={() => onMove(row.original, 1)}>
                    Move down
                  </MenuItem>
                </>
              ) : null}
              <MenuItem destructive onSelect={() => onDelete(key)}>
                Delete key
              </MenuItem>
            </Menu>
          );
        },
      }),
    ],
    [onAdd, onTest, onMove, onDelete]
  );

  return (
    <Card
      title="Your keys"
      subtitle="Encrypted at rest · tried in this order"
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" onClick={() => onAdd()}>
            Add key
          </Button>
        </Text>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        phoneSub={(row) =>
          row.key
            ? `${maskedKey(row.key.keyLast4)} · ${row.key.lastUsedAt ? `used ${formatLastUsed(row.key.lastUsedAt)}` : 'never used'}`
            : 'no key'
        }
        rowState={(row) => (row.key && row.key.id === testingKeyId ? { disabled: true } : undefined)}
      />
    </Card>
  );
}
