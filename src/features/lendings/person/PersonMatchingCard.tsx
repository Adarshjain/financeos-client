'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge, Button, Card, ListField, ListRow, showToast, Text } from '@/components/ds';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { type TransferRow, transferRows } from '../list/lendingsList';
import { useTransferLink } from '../list/useTransferLink';
import { loadPersonMatches } from './matchActions';

export interface PersonMatchingCardProps {
  counterpartyId: string;
  personName: string;
  /** "2 of 3 entries" */
  linked: string;
  /** Whether the person has an entry without a bank transaction: without one there is nothing to look for. */
  hasUnlinked: boolean;
}

/** This person's entries against bank transfers: how many are linked, and the transfers that look like unlinked ones. */
export function PersonMatchingCard({ counterpartyId, personName, linked, hasUnlinked }: PersonMatchingCardProps) {
  const router = useRouter();
  const { data: accounts = [] } = useAccounts();
  const [rows, setRows] = React.useState<TransferRow[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const transfer = useTransferLink(rows ?? [], () => router.refresh());

  const find = async () => {
    setLoading(true);
    try {
      const result = await loadPersonMatches(counterpartyId);
      if (!result.success) {
        showToast(result.error.message, { tone: 'danger' });
        return;
      }
      const names = new Map(accounts.map((a) => [a.id, a.name]));
      setRows(transferRows([{ counterpartyId, counterpartyName: personName, suggestions: result.data }], names));
    } finally {
      setLoading(false);
    }
  };

  const visible = (rows ?? []).filter((row) => !transfer.hidden(row));
  const pending = visible.filter((row) => !transfer.linked.has(row.key));

  // One transfer per entry (the first), none used twice.
  const confirmAll = async () => {
    const usedEntries = new Set<string>();
    const usedTransfers = new Set<string>();
    const picks = pending.filter((row) => {
      if (usedEntries.has(row.lendingId) || usedTransfers.has(row.transactionId)) return false;
      usedEntries.add(row.lendingId);
      usedTransfers.add(row.transactionId);
      return true;
    });
    setConfirming(true);
    let done = 0;
    for (const row of picks) {
      if (await transfer.onLink(row, true)) done += 1;
    }
    setConfirming(false);
    showToast(`Linked ${done} of ${picks.length}`);
  };

  return (
    <Card
      title="Matching"
      subtitle="Bank transfers ↔ entries"
      action={
        <Text variant="label" as="div" className="flex items-center gap-space-12">
          {pending.length > 0 ? (
            <Button variant="link" size="sm" onClick={() => void confirmAll()} disabled={confirming || transfer.linkingKey !== null}>
              {confirming ? 'Confirming…' : 'Confirm all'}
            </Button>
          ) : null}
          <Button variant="link" size="sm" onClick={() => void find()} disabled={loading || !hasUnlinked}>
            {loading ? 'Searching…' : 'Find matches'}
          </Button>
        </Text>
      }
    >
      <ListField label="Linked" value={linked} />
      {visible.length === 0 ? <ListField label="Suggested" value="none right now" /> : null}
      {visible.map((row) => {
        const isLinked = transfer.linked.has(row.key);
        return (
          <ListRow
            key={row.key}
            title={row.title}
            subtitle={
              isLinked ? `${row.subtitle.split(' · ')[0]} · already linked to the ${row.entryLabel} entry` : row.subtitle
            }
            wrap
            trailing={
              isLinked ? (
                <Badge tone="success">Linked</Badge>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={transfer.linkingKey === row.key}
                  disabled={transfer.linkingKey !== null || confirming}
                  onClick={() => void transfer.onLink(row)}
                >
                  Link
                </Button>
              )
            }
          />
        );
      })}
    </Card>
  );
}
