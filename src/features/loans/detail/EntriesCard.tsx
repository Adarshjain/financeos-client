'use client';

import React from 'react';

import { Card, EmptyState, FilterChip, ListRow, Menu, MenuItem, Text } from '@/components/ds';
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
          <MenuItem onSelect={() => onAddEvent('rate_change')}>Rate change</MenuItem>
          <MenuItem onSelect={() => onAddEvent('prepayment')}>Prepayment</MenuItem>
          <MenuItem onSelect={() => onAddEvent('foreclosure')}>Foreclosure</MenuItem>
          <MenuItem onSelect={onAddCharge}>Charge</MenuItem>
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
            actions={[{ id: 'delete', label: row.kind === 'event' ? 'Delete event' : 'Delete charge', destructive: true, onSelect: () => onDelete(row) }]}
          />
        ))
      )}
    </Card>
  );
}
