'use client';

import React from 'react';

import { Button, Card, ListField, Text } from '@/components/ds';
import type { MatchSuggestionsResponse } from '@/lib/loan.types';

import { nothingFound, suggestionRows } from './matchModel';

export interface MatchingCardProps {
  /** "13 of 13 paid EMIs" */
  linked: string;
  matches: MatchSuggestionsResponse | null;
  loading: boolean;
  onFind: () => void;
  onLink: (seq: number, date: string, amount: number, transactionId: string) => void;
  onConfirmAll: () => void;
}

/** EMIs against bank debits: how many paid EMIs are linked, and the debits that look like unpaid ones. */
export function MatchingCard({ linked, matches, loading, onFind, onLink, onConfirmAll }: MatchingCardProps) {
  const rows = suggestionRows(matches);
  return (
    <Card
      title="Matching"
      subtitle="EMIs ↔ bank debits"
      action={
        <Text variant="label" as="div" className="flex items-center gap-space-12">
          {rows.length > 0 ? (
            <Button variant="link" size="sm" onClick={onConfirmAll}>
              Confirm all
            </Button>
          ) : null}
          <Button variant="link" size="sm" onClick={onFind} disabled={loading}>
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
                onClick={() => onLink(row.seq, row.tx.date, Math.abs(row.tx.amount), row.tx.id)}
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
          value="No matching bank transactions found for due or overdue installments."
        />
      ) : null}
    </Card>
  );
}
