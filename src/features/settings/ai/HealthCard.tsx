import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';

import { type HealthRow, maskedKey } from './aiModel';

/** Model health: Ready, No key, or "Cooldown until 3:30 pm". */
export function HealthCard({ rows }: { rows: HealthRow[] }) {
  return (
    <Card>
      <Card.Header>
        <div className="min-w-0">
          <Card.Title>Health</Card.Title>
          <Card.Subtitle truncate={false}>A model that keeps failing rests for a while and is skipped</Card.Subtitle>
        </div>
      </Card.Header>
      {rows.map((row) => (
        <ListRow
          wrap
          key={row.id}
          title={
            <Text variant="body" as="span">
              {row.label}
              {row.last4 ? (
                <>
                  {' · '}
                  <Text variant="body" as="span" tone="ink-2" mono>
                    {maskedKey(row.last4)}
                  </Text>
                </>
              ) : null}
              {row.providerName ? (
                <>
                  {' · '}
                  <Text variant="body" as="span" tone="ink-3">
                    {row.providerName}
                  </Text>
                </>
              ) : null}
            </Text>
          }
          trailing={
            row.status === 'ready' ? (
              <StatusWord tone="success">Ready</StatusWord>
            ) : row.status === 'no-key' ? (
              <StatusWord tone="neutral">No key</StatusWord>
            ) : (
              <StatusWord tone="warning">Cooldown until {row.cooldownTime}</StatusWord>
            )
          }
        />
      ))}
    </Card>
  );
}
