'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';
import { Text } from '@/components/ds/Text/Text';

export interface ExpectedReturnCardProps {
  /** "28 Oct 2026", or null when no entry carries a date. */
  date: string | null;
  /** Export needs an entry. */
  canExport: boolean;
  onExport: () => void;
}

/** When the money is expected back, and the way to share the ledger. */
export function ExpectedReturnCard({ date, canExport, onExport }: ExpectedReturnCardProps) {
  return (
    <Card title="Expected return" subtitle="Shows on Upcoming and Home">
      <ListField label="Date" value={date ?? '—'} />
      <ListField
        label="Share"
        value={
          <Button variant="link" size="sm" disabled={!canExport} onClick={onExport}>
            Export ledger
          </Button>
        }
      />
    </Card>
  );
}

export interface PersonDetailsCardProps {
  notes: string | null;
  /** "May 2026", or null before any entry. */
  since: string | null;
  onEdit: () => void;
}

/** The person's notes and since when you have a ledger with them. */
export function PersonDetailsCard({ notes, since, onEdit }: PersonDetailsCardProps) {
  return (
    <Card
      title="Person"
      subtitle="Details"
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" onClick={onEdit}>
            Edit
          </Button>
        </Text>
      }
    >
      <ListField label="Notes" value={notes || '—'} />
      <ListField label="Since" value={since ?? '—'} />
    </Card>
  );
}
