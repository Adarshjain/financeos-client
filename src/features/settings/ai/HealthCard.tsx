import React from 'react';

import { Badge, Card, CardHeader, CardSubtitle, CardTitle, ListRow, Text } from '@/components/ds';

import { type HealthRow, maskedKey } from './aiModel';

/** Model health: Ready, No key, or "Cooldown until 3:30 pm". */
export function HealthCard({ rows }: { rows: HealthRow[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Health</CardTitle>
          <CardSubtitle truncate={false}>A model that keeps failing rests for a while and is skipped</CardSubtitle>
        </div>
      </CardHeader>
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
              <Badge tone="success">Ready</Badge>
            ) : row.status === 'no-key' ? (
              <Badge tone="neutral">No key</Badge>
            ) : (
              <Badge tone="warning">Cooldown until {row.cooldownTime}</Badge>
            )
          }
        />
      ))}
    </Card>
  );
}
