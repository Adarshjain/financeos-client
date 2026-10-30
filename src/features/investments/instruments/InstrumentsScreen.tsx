import React from 'react';

import { Text } from '@/components/ds/Text/Text';

import { InstrumentsListCard, type InstrumentsListCardProps } from './InstrumentsListCard';

export type InstrumentsScreenProps = InstrumentsListCardProps;

/** Instruments: where the prices come from, then the catalog. */
export function InstrumentsScreen(props: InstrumentsScreenProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Text variant="caption" tone="ink-3" as="div">
        Prices from Yahoo (stocks, ETFs) and AMFI (funds)
      </Text>
      <InstrumentsListCard {...props} />
    </div>
  );
}
