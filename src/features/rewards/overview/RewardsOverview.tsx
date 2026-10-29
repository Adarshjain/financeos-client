import React from 'react';

import { Card, EmptyState, Text } from '@/components/ds';
import { RewardsLoadError } from '@/features/accounts/detail/rewards/RewardsStates';

import type { RewardsOverviewData } from './overviewData';
import { RewardsCardList } from './RewardsCardList';

/** The Rewards overview: every card's earnings added up, then one row per card. */
export function RewardsOverview({ data }: { data: RewardsOverviewData }) {
  const { model } = data;
  if (!model) return <RewardsLoadError what="rewards" />;
  if (model.cards.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No credit cards yet"
          description="Rewards earned show once a credit card is added."
        />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="flex flex-col gap-space-2">
        <Text variant="overline" tone="ink-3" as="div">
          Earned this year
        </Text>
        <Text variant="hero-figure" family="display" as="div">
          {model.total}
        </Text>
        <Text variant="label" tone="ink-3" as="div">
          Each card over its own reward year
        </Text>
      </div>
      <RewardsCardList cards={model.cards} />
    </div>
  );
}
