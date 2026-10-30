import React from 'react';

import { concealMoney } from '@/components/ds/Conceal/concealMoney';
import { Hero } from '@/components/ds/Hero/Hero';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { Text } from '@/components/ds/Text/Text';

import type { LoanHeroModel } from './loanDetailModel';

/** The loan's headline: what is outstanding, the EMI to pay next, EMI, rate and months left, and the repayment bar. */
export function LoanHero({ model }: { model: LoanHeroModel }) {
  return (
    <Hero
      label="Outstanding"
      value={model.outstanding}
      change={model.next ? { text: model.next.text, tone: model.next.overdue ? 'danger' : undefined } : undefined}
      figures={model.figures}
    >
      <div className="flex flex-col gap-space-6">
        <ProgressBar value={model.timeline.pct} />
        <div className="flex justify-between gap-space-8">
          <Text variant="caption" tone="ink-3" as="span">
            {model.timeline.start}
          </Text>
          <Text variant="caption" tone="ink-3" as="span">
            {concealMoney(model.timeline.today)}
          </Text>
          <Text variant="caption" tone="ink-3" as="span">
            {model.timeline.end}
          </Text>
        </div>
      </div>
    </Hero>
  );
}
