import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';

export type CounterTone = 'ink' | 'warning' | 'danger';

export interface Counter {
  label: string;
  value: number;
  tone?: CounterTone;
}

/** Counter tiles: the number over its overline label. Parked reads warning, Failed danger, the rest neutral. */
export function SyncCounters({ counters, desktopColumns }: { counters: Counter[]; desktopColumns: 3 | 5 | 6 }) {
  return (
    <div
      className={`grid grid-cols-3 gap-space-6 ${desktopColumns === 6 ? 'desk:grid-cols-6' : desktopColumns === 3 ? 'desk:grid-cols-3' : 'desk:grid-cols-5'}`}
    >
      {counters.map((c) => (
        <Card
          key={c.label}
          variant="inset"
          data-testid="sync-counter"
          data-label={c.label}
          className="flex flex-col items-center gap-space-2 p-space-8"
        >
          <Text variant="title" tone={c.tone ?? 'ink'} align="center" data-testid="sync-counter-value" data-tone={c.tone ?? 'ink'}>
            {c.value}
          </Text>
          <Text variant="overline" tone="ink-3" align="center">
            {c.label}
          </Text>
        </Card>
      ))}
    </div>
  );
}
