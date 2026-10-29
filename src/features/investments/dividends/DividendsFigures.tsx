import React from 'react';

import { Conceal, Hero } from '@/components/ds';

import { type DividendsFigures, UNAVAILABLE } from './dividendsModel';

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
