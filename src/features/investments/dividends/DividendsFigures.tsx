import React from 'react';

import { Conceal, KpiTile, Text } from '@/components/ds';

import { type DividendsFigures, type DividendsTile, UNAVAILABLE } from './dividendsModel';

/** The phone's headline: what was received, then Declared and Not received side by side, then the TDS line. Desktop shows tiles instead. */
export function DividendsHero({ figures }: { figures: DividendsFigures }) {
  const { received, declared, notReceived, tds } = figures;
  return (
    <div className="desk:hidden flex flex-col gap-space-8 desk:gap-space-12">
      <div className="flex flex-col gap-space-2">
        <Text variant="label" tone="ink-3" as="div">
          {figures.fy ? 'Received this FY' : 'Received'}
        </Text>
        <Text variant="hero-figure" family="display" as="div">
          <Conceal>{received.value}</Conceal>
        </Text>
        {received.context ? (
          <Text variant="label" tone="positive" as="div">
            {received.context}
          </Text>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        <div className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            {figures.fy ? 'Declared · FY' : 'Declared'}
          </Text>
          <Text variant="figure" as="div">
            <Conceal>{declared.value}</Conceal>
          </Text>
          {declared.context ? (
            <Text variant="caption" tone="ink-3" as="div">
              {declared.context}
            </Text>
          ) : null}
        </div>
        <div className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            Not received
          </Text>
          <Text variant="figure" tone={notReceived.tone} as="div">
            <Conceal>{notReceived.value}</Conceal>
          </Text>
          {notReceived.context ? (
            <Text variant="caption" tone="ink-3" as="div">
              {notReceived.context}
            </Text>
          ) : null}
        </div>
      </div>
      {tds.value === UNAVAILABLE ? null : (
        <Text variant="label" tone="ink-3" as="div">
          <Conceal>{`TDS ${tds.value}`}</Conceal>
          {` · ${tds.context}`}
        </Text>
      )}
    </div>
  );
}

/** The four desktop tiles: Declared, Received, TDS, Not received. */
export function DividendsTiles({ tiles }: { tiles: DividendsTile[] }) {
  return (
    <div className="max-desk:hidden grid grid-cols-4 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
      {tiles.map((tile) => (
        <KpiTile
          key={tile.label}
          label={tile.label}
          value={
            tile.tone ? (
              <Text as="span" variant="figure" tone={tile.tone}>
                <Conceal>{tile.value}</Conceal>
              </Text>
            ) : (
              tile.value
            )
          }
          context={tile.context}
        />
      ))}
    </div>
  );
}
