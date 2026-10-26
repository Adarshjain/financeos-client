'use client';

import React from 'react';

import { Card, CardRow } from '@/components/ds';
import { Chart } from '@/components/organisms';

import type { ChatChartBlock } from './chat.types';

/** One chart block: the title in a card, the chart below. */
export function ChatChartCard({ chart }: { chart: ChatChartBlock }) {
  if (!chart.categories?.length || !chart.series?.length) return null;
  return (
    <Card title={chart.title}>
      <CardRow>
        <div className="w-full min-w-0">
          <Chart data={chart} />
        </div>
      </CardRow>
    </Card>
  );
}
