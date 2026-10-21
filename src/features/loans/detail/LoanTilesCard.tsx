import React from 'react';

import { Card, ProgressBar, Text } from '@/components/ds';

import type { LoanTilesModel } from './loanDetailModel';

/** The four figures of the loan with the timeline bar under them. */
export function LoanTilesCard({ model }: { model: LoanTilesModel }) {
  return (
    <Card>
      <div className="px-space-16 pt-space-16 pb-space-12 grid grid-cols-2 desk:grid-cols-4 gap-space-12 desk:gap-space-16">
        {model.tiles.map((tile) => (
          <div key={tile.label} className="min-w-0 flex flex-col gap-space-2">
            <Text variant="overline" tone="ink-3" as="div">
              {tile.label}
            </Text>
            <Text variant="figure" as="div">
              {tile.value}
            </Text>
            {tile.context ? (
              <Text variant="label" tone="ink-3" as="div">
                {tile.context}
              </Text>
            ) : null}
          </div>
        ))}
      </div>
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-6">
        <ProgressBar value={model.timeline.pct} />
        <div className="flex justify-between gap-space-8">
          <Text variant="caption" tone="ink-3" as="span">
            {model.timeline.start}
          </Text>
          <Text variant="caption" tone="ink-3" as="span">
            {model.timeline.today}
          </Text>
          <Text variant="caption" tone="ink-3" as="span">
            {model.timeline.end}
          </Text>
        </div>
      </div>
    </Card>
  );
}
