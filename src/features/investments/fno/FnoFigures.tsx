import React from 'react';

import { Card, Conceal, Hero, ListRow, ProgressBar, Text } from '@/components/ds';

import type { FnoFiguresModel, PnlBarRow, UnderlyingRow } from './fnoModel';

/** The headline: the year's realised P&L (green or red), then Win rate and Charges. A summary that failed to load says so. Same at both sizes. */
export function FnoHero({ figures, allYears = false }: { figures: FnoFiguresModel | null; allYears?: boolean }) {
  if (!figures) {
    return (
      <Hero
        label={realisedLabel(allYears)}
        value="—"
        change={{ text: "Couldn't load this summary. Try again.", tone: 'danger' }}
        figures={[
          { label: 'Win rate', value: '—' },
          { label: 'Charges', value: '—' },
        ]}
      />
    );
  }
  return (
    <Hero
      label={realisedLabel(allYears)}
      value={<Conceal>{figures.realised.text}</Conceal>}
      valueTone={figures.realised.tone}
      figures={[
        { label: 'Win rate', value: figures.winRate, caption: figures.winSub },
        { label: 'Charges', value: <Conceal>{figures.charges}</Conceal> },
      ]}
    />
  );
}

/** The realised figure's label: the financial year, or every year. */
export function realisedLabel(allYears: boolean): string {
  return allYears ? 'Realised · all years' : 'Realised · FY';
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
