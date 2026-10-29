'use client';

import React from 'react';

import { Card, EmptyState, FilterChip, ListRow, Menu, Text } from '@/components/ds';
import type { LoanEventType } from '@/lib/loan.types';

import { entriesCount,type EntryRow } from './entriesModel';

export interface EntriesCardProps {
  rows: EntryRow[];
  onAddEvent: (type: LoanEventType) => void;
  onAddCharge: () => void;
  onDelete: (row: EntryRow) => void;
}

/** Rate changes, prepayments and foreclosures, then the charges; Add opens the form for each. */
export function EntriesCard({ rows, onAddEvent, onAddCharge, onDelete }: EntriesCardProps) {
  return (
    <Card
      title="Events & charges"
      subtitle={entriesCount(rows.length)}
      action={
        <Menu align="end" trigger={<FilterChip hasDropdown>Add</FilterChip>}>
          <Menu.Item onSelect={() => onAddEvent('rate_change')}>Rate change</Menu.Item>
          <Menu.Item onSelect={() => onAddEvent('prepayment')}>Prepayment</Menu.Item>
          <Menu.Item onSelect={() => onAddEvent('foreclosure')}>Foreclosure</Menu.Item>
          <Menu.Item onSelect={onAddCharge}>Charge</Menu.Item>
        </Menu>
      }
    >
      {rows.length === 0 ? (
        <EmptyState compact description="No events or charges yet" />
      ) : (
        rows.map((row) => (
          <ListRow
            key={`${row.kind}:${row.id}`}
            wrap
            title={row.title}
            subtitle={row.subtitle}
            trailing={
              <Text variant="body-strong" tone={row.amount ? 'ink' : 'ink-3'} as="span">
                {row.amount ?? '—'}
              </Text>
            }
            actions={[{ id: 'delete', label: row.kind === 'event' ? 'Delete event' : 'Delete charge', tone: 'danger', onSelect: () => onDelete(row) }]}
          />
        ))
      )}
    </Card>
  );
}
