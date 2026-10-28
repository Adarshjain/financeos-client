import React from 'react';

import { Conceal, KpiTile, Text } from '@/components/ds';

import type { EpfFigures } from './epfModel';

/** The phone's headline, like the other Investments tabs: the balance, then contributed this FY and interest so far side by side, then the last interest line. Desktop shows tiles instead. */
export function EpfHero({ figures }: { figures: EpfFigures }) {
  const { balance, contributed, interest, lastInterest } = figures;
  const pair = [
    { label: 'Contributed this FY', value: contributed.value, context: contributed.phoneContext },
    { label: 'Interest so far', value: interest.value, context: interest.context.split(' · ')[0] },
  ];
  return (
    <div className="desk:hidden flex flex-col gap-space-8 desk:gap-space-12">
      <div className="flex flex-col gap-space-2">
        <Text variant="label" tone="ink-3" as="div">
          EPF balance
        </Text>
        <Text variant="hero-figure" family="display" as="div">
          <Conceal>{balance.value}</Conceal>
        </Text>
        {balance.phoneContext ? (
          <Text variant="label" tone="ink-3" as="div">
            {balance.phoneContext}
          </Text>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        {pair.map((p) => (
          <div key={p.label} className="flex flex-col gap-space-2 min-w-0">
            <Text variant="label" tone="ink-3" as="div">
              {p.label}
            </Text>
            <Text variant="figure" as="div">
              <Conceal>{p.value}</Conceal>
            </Text>
            {p.context ? (
              <Text variant="caption" tone="ink-3" as="div">
                <Conceal>{p.context}</Conceal>
              </Text>
            ) : null}
          </div>
        ))}
      </div>
      {lastInterest.phoneContext ? (
        <Text variant="label" tone="ink-3" as="div">
          <Conceal>{`Last interest ${lastInterest.value}`}</Conceal>
          {` · ${lastInterest.phoneContext}`}
        </Text>
      ) : null}
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
