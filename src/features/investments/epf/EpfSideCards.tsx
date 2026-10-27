import React from 'react';

import { Button, Card, Conceal, EmptyState, ListRow, Text } from '@/components/ds';

import type { EpfSummary } from './epfModel';
import { type EpfEmployerRow, pensionCard } from './epfModel';

export interface EpfEmployersCardProps {
  rows: EpfEmployerRow[];
  onAdd: () => void;
  onEdit: (id: string) => void;
}

/** Every employer with its balance and status. A row opens the employer to edit. */
export function EpfEmployersCard({ rows, onAdd, onEdit }: EpfEmployersCardProps) {
  return (
    <Card
      title="Employers"
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" onClick={onAdd}>
            Add employer
          </Button>
        </Text>
      }
    >
      {rows.length === 0 ? <EmptyState compact description="No employers yet." /> : null}
      {rows.map((row) => (
        <ListRow
          key={row.id}
          wrap
          title={row.name}
          subtitle={row.line}
          onClick={() => onEdit(row.id)}
          trailing={
            <div className="flex flex-col items-end">
              <Text variant="body-strong" as="div">
                <Conceal>{row.balance}</Conceal>
              </Text>
              <Text variant="caption" tone="ink-3" as="div">
                {row.status}
              </Text>
            </div>
          }
        />
      ))}
    </Card>
  );
}

/** The estimated EPS pension at 58, from the service counted so far. Shown only when the server has an estimate. */
export function EpfPensionCard({ pension }: { pension: NonNullable<EpfSummary['pension']> }) {
  const card = pensionCard(pension);
  return (
    <Card title="Pension (EPS)">
      <div className="flex flex-col gap-space-8 px-space-16 pb-space-16">
        <div className="flex items-baseline gap-space-6">
          <Text variant="figure" as="span">
            <Conceal>{card.value}</Conceal>
          </Text>
          <Text variant="label" tone="ink-3" as="span">
            a month at 58
          </Text>
        </div>
        <Text variant="body" tone="ink-2" as="p">
          {card.note}
        </Text>
        <Text variant="caption" tone="ink-3" as="p">
          {card.service}
        </Text>
      </div>
    </Card>
  );
}
