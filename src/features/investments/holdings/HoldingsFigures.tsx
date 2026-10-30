import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Hero } from '@/components/ds/Hero/Hero';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { Text } from '@/components/ds/Text/Text';

import { type HoldingsHeroModel, type Mover, type TaxCardModel } from './holdingsModel';

/** The headline: current value with today's move, then Invested and Unrealised P&L. Same at both sizes. */
export function HoldingsHero({ hero }: { hero: HoldingsHeroModel }) {
  return (
    <Hero
      label="Current value"
      value={<Conceal>{hero.value}</Conceal>}
      change={hero.day ? { text: <Conceal>{hero.day.text}</Conceal>, tone: hero.day.tone } : undefined}
      figures={[
        { label: 'Invested', value: <Conceal>{hero.invested}</Conceal> },
        {
          label: 'Unrealised P&L',
          value: <Conceal>{hero.unrealised.text}</Conceal>,
          tone: hero.unrealised.tone,
          caption: hero.unrealisedSub ? <Conceal>{hero.unrealisedSub}</Conceal> : undefined,
        },
      ]}
    />
  );
}

/** Each asset type's share of the value: one split bar with its legend. */
export function AllocationCard({ segments }: { segments: { value: number; label: string; color: 'chart-1' | 'chart-2' | 'chart-3' }[] }) {
  return (
    <Card title="Allocation" subtitle="By asset type">
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-8 desk:gap-space-12">
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
