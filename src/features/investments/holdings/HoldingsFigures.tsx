import React from 'react';

import { Card, Conceal, KpiTile, ListRow, ProgressBar, Text } from '@/components/ds';

import { type HoldingsHeroModel, type HoldingsTile, type Mover, type TaxCardModel } from './holdingsModel';

/** The phone's headline: current value (no label), today's move, then Invested and Unrealised P&L side by side. Desktop shows tiles instead. */
export function HoldingsHero({ hero }: { hero: HoldingsHeroModel }) {
  return (
    <div className="desk:hidden flex flex-col gap-space-12">
      <div className="flex flex-col gap-space-2">
        <Text variant="hero-figure" family="display" as="div">
          {hero.value}
        </Text>
        {hero.day ? (
          <Text variant="label" tone={hero.day.tone} as="div">
            {hero.day.text}
          </Text>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-space-16">
        <div className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            Invested
          </Text>
          <Text variant="figure" as="div">
            {hero.invested}
          </Text>
        </div>
        <div className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            Unrealised P&amp;L
          </Text>
          <Text variant="figure" tone={hero.unrealised.tone} as="div">
            {hero.unrealised.text}
          </Text>
          {hero.unrealisedSub ? (
            <Text variant="caption" tone="ink-3" as="div">
              {hero.unrealisedSub}
            </Text>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The four desktop tiles. A tile that failed to load (null) says so under its label. */
export function HoldingsTiles({ tiles, failedLabels }: { tiles: (HoldingsTile | null)[]; failedLabels: string[] }) {
  return (
    <div className="max-desk:hidden grid grid-cols-4 gap-space-16">
      {tiles.map((tile, i) =>
        tile ? (
          <KpiTile
            key={tile.label}
            label={tile.label}
            value={
              tile.tone ? (
                <Text as="span" variant="figure" tone={tile.tone}>
                  {tile.value}
                </Text>
              ) : (
                tile.value
              )
            }
            context={tile.context}
          />
        ) : (
          <KpiTile key={failedLabels[i]} label={failedLabels[i]} error="Could not load this figure. Refresh the page to try again." />
        ),
      )}
    </div>
  );
}

/** Each asset type's share of the value: one split bar with its legend. */
export function AllocationCard({ segments }: { segments: { value: number; label: string; color: 'chart-1' | 'chart-2' | 'chart-3' }[] }) {
  return (
    <Card title="Allocation" subtitle="By asset type">
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-12">
        <ProgressBar segments={segments.map((s) => ({ value: s.value, label: s.label, color: s.color }))} />
        <ProgressBar.Legend items={segments.map((s) => ({ label: s.label, color: s.color }))} />
      </div>
    </Card>
  );
}

/** This financial year: realised gains, what is left of the LTCG exemption, what to book or offset. */
export function TaxCard({ model }: { model: TaxCardModel }) {
  return (
    <Card title="Tax this FY" subtitle={model.fy}>
      {model.rows.map((row) => (
        <ListRow
          key={row.label}
          title={row.label}
          subtitle={row.sub}
          trailing={
            <Text variant="body-strong" tone={row.tone}>
              <Conceal>{row.value}</Conceal>
            </Text>
          }
        />
      ))}
    </Card>
  );
}

/** The biggest day moves in rupees. */
export function TopMoversCard({ movers }: { movers: Mover[] }) {
  return (
    <Card title="Top movers today" subtitle="By ₹ change">
      {movers.map((m) => (
        <ListRow
          key={m.id}
          title={m.symbol}
          trailing={
            <Text variant="body-strong" tone={m.tone}>
              <Conceal>{m.amount}</Conceal>
            </Text>
          }
        />
      ))}
    </Card>
  );
}
