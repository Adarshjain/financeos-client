'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { LazyChart as Chart } from '@/lib/lazy/LazyChart';

import type { ChatChartBlock } from './chat.types';

/** One chart block: the title in a card, the chart below. */
export function ChatChartCard({ chart }: { chart: ChatChartBlock }) {
  if (!chart.categories?.length || !chart.series?.length) return null;
  return (
    <Card title={chart.title}>
      <Card.Row>
        <div className="w-full min-w-0">
          <Chart data={chart} />
        </div>
      </Card.Row>
    </Card>
  );
}
