import React from 'react';

import { Hero } from '@/components/ds';

import type { UpcomingTile } from './upcomingModel';

/**
 * The page's Hero: Next 7 days is the headline (₹0 when nothing falls in it), Overdue and Due back to you are the
 * figures beside it. Hidden when no tile has anything in it.
 */
export function UpcomingTotals({ tiles }: { tiles: UpcomingTile[] }) {
  if (tiles.length === 0) return null;
  const next7 = tiles.find((t) => t.id === 'next7');
  const figures = tiles
    .filter((t) => t.id === 'overdue' || t.id === 'dueBack')
    .map((t) => ({ label: t.label, value: t.value, tone: t.tone === 'ink' ? undefined : t.tone, caption: t.caption }));
  return (
    <Hero
      data-testid="upcoming-hero"
      label="Next 7 days"
      value={next7?.value ?? '₹0'}
      figures={figures}
    />
  );
}
