import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Hero } from '@/components/ds/Hero/Hero';
import { LoadError } from '@/features/shell/LoadError';

import type { RewardsOverviewData } from './overviewData';
import { RewardsCardList } from './RewardsCardList';

/** The Rewards overview: every card's earnings added up, then one row per card. */
export function RewardsOverview({ data }: { data: RewardsOverviewData }) {
  const { model } = data;
  if (!model) return <LoadError what="rewards" />;
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
      <Hero label="Earned this year" value={model.total} />
      <RewardsCardList cards={model.cards} />
    </div>
  );
}
