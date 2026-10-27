import React from 'react';

import { KpiTile } from '@/components/ds';

import type { EpfFigures } from './epfModel';

/** The phone's four tiles, two by two: balance, contributed this FY, interest so far and last interest. Desktop shows the wider tiles instead. */
export function EpfHero({ figures }: { figures: EpfFigures }) {
  const { balance, contributed, interest, lastInterest } = figures;
  const tiles = [
    { label: 'EPF balance', value: balance.value, context: balance.phoneContext },
    { label: 'Contributed this FY', value: contributed.value, context: contributed.phoneContext },
    { label: 'Interest so far', value: interest.value, context: interest.context.split(' · ')[0] },
    { label: 'Last interest', value: lastInterest.value, context: lastInterest.phoneContext },
  ];
  return (
    <div className="desk:hidden grid grid-cols-2 gap-space-12">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} label={tile.label} value={tile.value} context={tile.context || undefined} />
      ))}
    </div>
  );
}

/** The four desktop tiles: balance, contributed this FY, interest so far and last interest credited. */
export function EpfTiles({ figures }: { figures: EpfFigures }) {
  const { balance, contributed, interest, lastInterest } = figures;
  const tiles = [
    { label: 'EPF balance', ...balance },
    { label: 'Contributed this FY', ...contributed },
    { label: 'Interest so far this FY', ...interest },
    { label: 'Last interest credited', ...lastInterest },
  ];
  return (
    <div className="max-desk:hidden grid grid-cols-4 gap-space-16">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} label={tile.label} value={tile.value} context={tile.context || undefined} />
      ))}
    </div>
  );
}
