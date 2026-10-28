import React from 'react';

import { KpiTile } from '@/components/ds';

import type { EpfFigures } from './epfModel';

/** The phone's four tiles, two by two: balance, contributed, interest and last interest, for the employer and year picked. Desktop shows the wider tiles instead. */
export function EpfHero({ figures }: { figures: EpfFigures }) {
  const { balance, contributed, interest, lastInterest, labels } = figures;
  const tiles = [
    { label: labels.balance.phone, value: balance.value, context: balance.phoneContext },
    { label: labels.contributed.phone, value: contributed.value, context: contributed.phoneContext },
    { label: labels.interest.phone, value: interest.value, context: interest.context.split(' · ')[0] },
    { label: labels.lastInterest.phone, value: lastInterest.value, context: lastInterest.phoneContext },
  ];
  return (
    <div className="desk:hidden grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} label={tile.label} value={tile.value} context={tile.context || undefined} />
      ))}
    </div>
  );
}

/** The four desktop tiles: balance, contributed, interest and last interest credited, for the employer and year picked. */
export function EpfTiles({ figures }: { figures: EpfFigures }) {
  const { balance, contributed, interest, lastInterest, labels } = figures;
  const tiles = [
    { label: labels.balance.desk, ...balance },
    { label: labels.contributed.desk, ...contributed },
    { label: labels.interest.desk, ...interest },
    { label: labels.lastInterest.desk, ...lastInterest },
  ];
  return (
    <div className="max-desk:hidden grid grid-cols-4 gap-space-16">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} label={tile.label} value={tile.value} context={tile.context || undefined} />
      ))}
    </div>
  );
}
