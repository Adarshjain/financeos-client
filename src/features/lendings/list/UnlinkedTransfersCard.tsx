'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, Card, ListRow, showToast, StatusWord } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { useDeleteLending, useRecordSettlement } from '../useLendingMutations';
import type { TransferRow, UnrecordedRow } from './lendingsListModel';
import { useTransferLink } from './useTransferLink';

/**
 * Bank transfers that look like ledger entries. Each (entry, candidate) pair is a row with Link. Linking
 * keeps the row in place as "already linked to the … entry" (until the next refresh) and toasts with Undo, which
 * unlinks it and restores the row. Transfers that name a person with no entry get "Record as settlement":
 * the row disappears and the toast's Undo deletes the new entry.
 */
export function UnlinkedTransfersCard({ rows, unrecorded = [] }: { rows: TransferRow[]; unrecorded?: UnrecordedRow[] }) {
  const router = useRouter();
  const onError = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });
  const record = useRecordSettlement({ onError: onError("Couldn't record settlement. Try again.") });
  const deleteEntry = useDeleteLending({ onError: onError("Couldn't undo settlement. Try again.") });
  const [recordingKey, setRecordingKey] = React.useState<string | null>(null);
  const [recorded, setRecorded] = React.useState<ReadonlySet<string>>(new Set());
  const markRecorded = (key: string, on: boolean) =>
    setRecorded((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const { linkingKey, linked, hidden, onLink } = useTransferLink(rows);

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
                <StatusWord tone="success">Linked</StatusWord>
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
