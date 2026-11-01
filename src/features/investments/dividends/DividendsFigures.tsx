import React from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { GRID_GAP } from '@/components/ds/gridGap';
import { Hero } from '@/components/ds/Hero/Hero';
import { KpiTile } from '@/components/ds/KpiTile/KpiTile';

import { type DividendsFigures, type ReceiptTile, UNAVAILABLE } from './dividendsModel';

/** The headline: what was received (green), then TDS and Not received. Same at both sizes. */
export function DividendsHero({ figures }: { figures: DividendsFigures }) {
  const { received, tds, notReceived } = figures;
  return (
    <Hero
      label={figures.fy ? 'Received this FY' : 'Received'}
      value={<Conceal>{received.value}</Conceal>}
      valueTone={received.value === UNAVAILABLE ? undefined : 'positive'}
      change={received.context ? { text: received.context, tone: 'ink-3' } : undefined}
      figures={[
        { label: 'TDS', value: <Conceal>{tds.value}</Conceal>, caption: tds.context || undefined },
        { label: 'Not received', value: <Conceal>{notReceived.value}</Conceal>, caption: notReceived.context || undefined },
      ]}
    />
  );
}

/** Received, Awaiting and Overdue with their payout counts, as three tiles under the hero. */
export function ReceiptTiles({ tiles }: { tiles: ReceiptTile[] }) {
  return (
    <div className={`grid grid-cols-3 ${GRID_GAP}`} data-testid="receipt-tiles">
      {tiles.map((t) => (
        <KpiTile key={t.label} label={t.label} value={t.value} context={t.context} />
      ))}
    </div>
  );
}
