import React from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Hero } from '@/components/ds/Hero/Hero';

import type { EpfFigures } from './epfModel';

/** The headline: the EPF balance (with the passbook's month), then contributed this FY and interest so far. Same at both sizes. */
export function EpfHero({ figures }: { figures: EpfFigures }) {
  const { balance, contributed, interest } = figures;
  return (
    <Hero
      label="EPF balance"
      value={<Conceal>{balance.value}</Conceal>}
      change={balance.context ? { text: balance.context } : undefined}
      figures={[
        { label: 'Contributed this FY', value: <Conceal>{contributed.value}</Conceal>, caption: <Conceal>{contributed.context}</Conceal> },
        {
          label: 'Interest so far',
          value: <Conceal>{interest.value}</Conceal>,
          caption: interest.context ? <Conceal>{interest.context}</Conceal> : undefined,
        },
      ]}
    />
  );
}
