import React from 'react';

import { Card, Conceal, KpiTile, ListRow, ProgressBar, Text } from '@/components/ds';

import type { FnoFiguresModel, PnlBarRow, UnderlyingRow } from './fnoModel';

/** The phone's headline: the year's realised P&L, then Win rate and Charges side by side. Desktop shows tiles instead. */
export function FnoHero({ figures, allYears = false }: { figures: FnoFiguresModel; allYears?: boolean }) {
  return (
    <div className="desk:hidden flex flex-col gap-space-8 desk:gap-space-12">
      <div className="flex flex-col gap-space-2">
        <Text variant="label" tone="ink-3" as="div">
          {realisedLabel(allYears)}
        </Text>
        <Text variant="hero-figure" family="display" tone={figures.realised.tone} as="div">
          <Conceal>{figures.realised.text}</Conceal>
        </Text>
        <Text variant="label" tone="ink-3" as="div">
          {figures.realisedSub}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        <div className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            Win rate
          </Text>
          <Text variant="figure" as="div">
            {figures.winRate}
          </Text>
          <Text variant="caption" tone="ink-3" as="div">
            {figures.winSub}
          </Text>
        </div>
        <div className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            Charges
          </Text>
          <Text variant="figure" as="div">
            <Conceal>{figures.charges}</Conceal>
          </Text>
          <Text variant="caption" tone="ink-3" as="div">
            {figures.chargesSub}
          </Text>
        </div>
      </div>
    </div>
  );
}

/** The realised figure's label: the financial year, or every year. */
export function realisedLabel(allYears: boolean): string {
  return allYears ? 'Realised · all years' : 'Realised · FY';
}

/** The three desktop tiles. A summary that failed to load (null) says so in each. */
export function FnoTiles({ figures, allYears = false }: { figures: FnoFiguresModel | null; allYears?: boolean }) {
  return (
    <div className="max-desk:hidden grid grid-cols-3 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
      {figures ? (
        <>
          <KpiTile
            label={realisedLabel(allYears)}
            value={
              figures.realised.tone ? (
                <Text as="span" variant="figure" tone={figures.realised.tone}>
                  <Conceal>{figures.realised.text}</Conceal>
                </Text>
              ) : (
                figures.realised.text
              )
            }
            context={figures.realisedSub}
          />
          <KpiTile label="Win rate" value={figures.winRate} context={figures.winSub} />
          <KpiTile label="Charges" value={figures.charges} context={figures.chargesSub} />
        </>
      ) : (
        [realisedLabel(allYears), 'Win rate', 'Charges'].map((label) => (
          <KpiTile key={label} label={label} error="Couldn't load this figure. Try again." />
        ))
      )}
    </div>
  );
}

/** The months with a result, each a bar sized against the biggest month. */
export function MonthCard({ rows, fy }: { rows: PnlBarRow[]; fy: string }) {
  return (
    <Card title="P&L by month" subtitle={fy}>
      {rows.map((row) => (
        <div key={row.key} className="px-space-16 pb-space-12 flex flex-col gap-space-6">
          <div className="flex items-baseline justify-between gap-space-12">
            <Text variant="body">{row.label}</Text>
            <Text variant="body-strong" tone={row.tone}>
              <Conceal>{row.amount}</Conceal>
            </Text>
          </div>
          <ProgressBar value={row.pct} tone={row.barTone} />
        </div>
      ))}
    </Card>
  );
}

/** Each underlying's result over the year's closed trades. */
export function UnderlyingCard({ rows }: { rows: UnderlyingRow[] }) {
  return (
    <Card title="By underlying" subtitle="Closed trades">
      {rows.map((row) => (
        <ListRow
          key={row.key}
          title={row.label}
          trailing={
            <Text variant="body-strong" tone={row.tone}>
              <Conceal>{row.amount}</Conceal>
            </Text>
          }
        />
      ))}
    </Card>
  );
}
