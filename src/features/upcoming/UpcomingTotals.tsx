import React from 'react';

import {
  GRID_GAP,
  KpiTile,
  Text,
} from '@/components/ds';

import type { UpcomingTile } from './upcomingModel';

/** The totals row: two across on phone, four on desktop. Hidden when no tile has anything in it. */
export function UpcomingTotals({ tiles }: { tiles: UpcomingTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <div className={`grid grid-cols-2 desk:grid-cols-4 ${GRID_GAP}`}>
      {tiles.map((t) => (
        <KpiTile
          key={t.id}
          data-testid={`tile-${t.id}`}
          label={t.label}
          value={
            t.tone === 'ink' ? (
              t.value
            ) : (
              <Text variant="figure" tone={t.tone}>
                {t.value}
              </Text>
            )
          }
          context={t.caption}
        />
      ))}
    </div>
  );
}
