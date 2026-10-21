'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge, Button, Card, ListRow, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { useLinkLendingTransaction, useUnlinkLendingTransaction } from '../useLendingTransactionLink';
import { useDeleteLending, useRecordSettlement } from '../useRecordSettlement';
import type { TransferRow, UnrecordedRow } from './lendingsList';

/**
 * Bank transfers that look like ledger entries. Each (entry, candidate) pair is a row with Link. Linking
 * keeps the row in place as "already linked to the … entry" (until the next refresh) and toasts with Undo, which
 * unlinks it and restores the row. Transfers that name a person with no entry get "Record as settlement":
 * the row disappears and the toast's Undo deletes the new entry.
 */
export function UnlinkedTransfersCard({ rows, unrecorded = [] }: { rows: TransferRow[]; unrecorded?: UnrecordedRow[] }) {
  const router = useRouter();
  const onError = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });
  const link = useLinkLendingTransaction({ onError: onError('Failed to link transaction') });
  const unlink = useUnlinkLendingTransaction({ onError: onError('Failed to unlink transaction') });
  const record = useRecordSettlement({ onError: onError('Failed to record settlement') });
  const deleteEntry = useDeleteLending({ onError: onError('Failed to undo settlement') });
  const [recordingKey, setRecordingKey] = React.useState<string | null>(null);
  const [recorded, setRecorded] = React.useState<ReadonlySet<string>>(new Set());
  const markRecorded = (key: string, on: boolean) =>
    setRecorded((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const [linkingKey, setLinkingKey] = React.useState<string | null>(null);
  const [linked, setLinked] = React.useState<ReadonlySet<string>>(new Set());
  const mark = (key: string, on: boolean) =>
    setLinked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  // Rows that share an entry or a transaction with a linked row are hidden, so none can re-link it.
  const hidden = (row: TransferRow) =>
    !linked.has(row.key) &&
    rows.some((other) => linked.has(other.key) && (other.lendingId === row.lendingId || other.transactionId === row.transactionId));

  const undo = async (row: TransferRow) => {
    try {
      await unlink.mutateAsync(row.lendingId);
      mark(row.key, false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  const onLink = async (row: TransferRow) => {
    setLinkingKey(row.key);
    try {
      await link.mutateAsync({ id: row.lendingId, transactionId: row.transactionId });
      mark(row.key, true);
      showToast(`Linked to ${row.personName}`, { action: { label: 'Undo', onSelect: () => void undo(row) } });
    } catch {
      // onError already surfaced the toast.
    } finally {
      setLinkingKey(null);
    }
  };

  const undoRecord = async (row: UnrecordedRow, entryId: string) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      markRecorded(row.key, false);
      router.refresh();
    } catch {
      // onError already surfaced the toast.
    }
  };

  const onRecord = async (row: UnrecordedRow) => {
    setRecordingKey(row.key);
    try {
      const entry = await record.mutateAsync({ counterpartyId: row.counterpartyId, transactionId: row.transactionId });
      markRecorded(row.key, true);
      router.refresh();
      showToast(`Recorded as settlement with ${row.personName}`, {
        action: { label: 'Undo', onSelect: () => void undoRecord(row, entry.id) },
      });
    } catch {
      // onError already surfaced the toast.
    } finally {
      setRecordingKey(null);
    }
  };

  const unrecordedRows = unrecorded.filter((row) => !recorded.has(row.key));

  return (
    <Card title="Unlinked bank transfers" subtitle="Look like lending entries">
      {rows.filter((row) => !hidden(row)).map((row) => {
        const isLinked = linked.has(row.key);
        return (
          <ListRow
            key={row.key}
            title={row.title}
            subtitle={isLinked ? `${row.subtitle.split(' · ')[0]} · already linked to the ${row.entryLabel} entry` : row.subtitle}
            wrap
            trailing={
              isLinked ? (
                <Badge tone="success">Linked</Badge>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={linkingKey === row.key}
                  disabled={linkingKey !== null}
                  onClick={() => void onLink(row)}
                >
                  Link
                </Button>
              )
            }
          />
        );
      })}
      {unrecordedRows.map((row) => (
        <ListRow
          key={row.key}
          title={row.title}
          subtitle={row.subtitle}
          wrap
          trailing={
            <Button
              variant="link"
              size="sm"
              loading={recordingKey === row.key}
              disabled={recordingKey !== null}
              onClick={() => void onRecord(row)}
            >
              Record as settlement
            </Button>
          }
        />
      ))}
    </Card>
  );
}
