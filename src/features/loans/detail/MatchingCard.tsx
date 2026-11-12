'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { ListField } from '@/components/ds/ListField/ListField';
import { Text } from '@/components/ds/Text/Text';
import type { MatchSuggestionsResponse } from '@/lib/loan.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { ambiguousNote, confirmAllPlan, nothingFound, suggestionRows } from './matchModel';

export interface MatchingCardProps {
  /** "13 of 13 paid EMIs" */
  linked: string;
  matches: MatchSuggestionsResponse | null;
  loading: boolean;
  /** A suggested debit is being linked: the link and Confirm all buttons wait. */
  busy?: boolean;
  onFind: () => void;
  onLink: (seq: number, date: string, amount: number, transactionId: string) => void;
  onConfirmAll: () => void;
}

/** EMIs against bank debits: how many paid EMIs are linked, and the debits that look like unpaid ones. */
export function MatchingCard({ linked, matches, loading, busy = false, onFind, onLink, onConfirmAll }: MatchingCardProps) {
  const rows = suggestionRows(matches);
  const { data: accounts = [] } = useAccounts();
  const [confirming, setConfirming] = React.useState(false);
  const plan = confirmAllPlan(matches, new Map(accounts.map((a) => [a.id, a.name])));
  return (
    <>
    <Card
      title="Matching"
      subtitle="EMIs ↔ bank debits"
      action={
        <Text variant="label" as="div" className="flex items-center gap-space-12">
          {plan.pairs.length > 0 ? (
            <Button variant="link" size="sm" loading={busy} onClick={() => setConfirming(true)}>
              Confirm all
            </Button>
          ) : null}
          <Button variant="link" size="sm" onClick={onFind} disabled={loading || busy}>
            {loading ? 'Searching…' : 'Find matches'}
          </Button>
        </Text>
      }
    >
      <ListField label="Linked" value={linked} />
      {rows.map((row) => (
        <ListField
          key={row.key}
          label="Suggested"
          value={
            <>
              {row.text}
              {' · '}
              <Button
                variant="link"
                size="sm"
                disabled={busy}
                onClick={() => onLink(row.seq, row.tx.date, row.amount, row.tx.id)}
              >
                link
              </Button>
            </>
          }
        />
      ))}
      {nothingFound(matches) ? (
        <ListField
          label="Suggested"
          value="No matching bank transactions for due or overdue installments."
        />
      ) : null}
    </Card>
    <ConfirmDialog
      open={confirming}
      onOpenChange={setConfirming}
      title="Link these payments?"
      description="Each EMI below will be marked paid by its bank debit."
      confirmLabel={`Link ${plan.pairs.length}`}
      tone="default"
      size="lg"
      onConfirm={() => {
        setConfirming(false);
        onConfirmAll();
      }}
    >
      <ul className="flex flex-col gap-space-8">
        {plan.pairs.map((p) => (
          <Text key={p.seq} as="li" variant="label">
            {p.text}
          </Text>
        ))}
      </ul>
      {plan.ambiguous > 0 ? (
        <Text variant="label" tone="ink-3" as="p">
          {ambiguousNote(plan.ambiguous)}
        </Text>
      ) : null}
    </ConfirmDialog>
    </>
  );
}
