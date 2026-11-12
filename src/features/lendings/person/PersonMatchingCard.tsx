'use client';

import { useMutation } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { ListField } from '@/components/ds/ListField/ListField';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { type TransferRow, transferRows } from '@/features/lendings/list/lendingsListModel';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useAppRouter } from '@/lib/useAppRouter';

import { useTransferLink } from '../list/useTransferLink';
import { loadPersonMatches } from './personMatchActions';
import { leftOutNote, transferConfirmPlan } from './personModel';

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
  const router = useAppRouter();
  const { data: accounts = [] } = useAccounts();
  const [rows, setRows] = React.useState<TransferRow[] | null>(null);
  const transfer = useTransferLink(rows ?? [], () => router.refresh());

  const findMutation = useMutation({
    mutationFn: () => unwrapAction(loadPersonMatches(counterpartyId)),
    onSuccess: (suggestions) => {
      const names = new Map(accounts.map((a) => [a.id, a.name]));
      setRows(transferRows([{ counterpartyId, counterpartyName: personName, suggestions }], names));
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't look for matches. Try again."), { tone: 'danger' }),
  });
  const loading = findMutation.isPending;

  const visible = (rows ?? []).filter((row) => !transfer.hidden(row));
  const pending = visible.filter((row) => !transfer.linked.has(row.key));

  const [asking, setAsking] = React.useState(false);
  const plan = transferConfirmPlan(pending);
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { picks } = plan;
      let done = 0;
      for (const row of picks) {
        if (await transfer.onLink(row, true)) done += 1;
      }
      return { done, total: picks.length };
    },
    onSuccess: ({ done, total }) => showToast(`Linked ${done} of ${total}`),
  });
  const confirming = confirmMutation.isPending;

  return (
    <>
    <Card
      title="Matching"
      subtitle="Bank transfers ↔ entries"
      action={
        <Text variant="label" as="div" className="flex items-center gap-space-12">
          {pending.length > 0 ? (
            <Button variant="link" size="sm" onClick={() => setAsking(true)} disabled={confirming || transfer.linkingKey !== null}>
              {confirming ? 'Confirming…' : 'Confirm all'}
            </Button>
          ) : null}
          <Button variant="link" size="sm" onClick={() => findMutation.mutate()} disabled={loading || !hasUnlinked}>
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
                <StatusWord tone="success">Linked</StatusWord>
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
    <ConfirmDialog
      open={asking}
      onOpenChange={setAsking}
      title="Link these transfers?"
      description="Each bank transfer below will be linked to its entry."
      confirmLabel={`Link ${plan.picks.length}`}
      tone="default"
      size="lg"
      onConfirm={() => {
        setAsking(false);
        confirmMutation.mutate();
      }}
    >
      <ul className="flex flex-col gap-space-8">
        {plan.picks.map((row) => (
          <li key={row.key}>
            <Text variant="label" as="div">
              {row.title}
            </Text>
            <Text variant="caption" tone="ink-3" as="div">
              {`Entry ${row.entryLabel} · ${row.subtitle}`}
            </Text>
          </li>
        ))}
      </ul>
      {plan.leftOut > 0 ? (
        <Text variant="label" tone="ink-3" as="p">
          {leftOutNote(plan.leftOut)}
        </Text>
      ) : null}
    </ConfirmDialog>
    </>
  );
}
