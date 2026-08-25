'use client';

import React from 'react';

import { ChartView } from '@/components/reports/views/ChartView';

export interface ChatChartBlock {
  chartType: 'bar' | 'stackedBar' | 'line' | 'area' | 'pie' | 'donut';
  title?: string;
  categories: string[];
  series: { name: string; data: (number | null)[] }[];
}

interface ChatChartCardProps {
  chart: ChatChartBlock;
}

export function ChatChartCard({ chart }: ChatChartCardProps) {
  if (!chart || !chart.categories?.length || !chart.series?.length) {
    return null;
  }

  return (
    <div className="rounded-[10px] bg-[var(--surface)] p-3 shadow-[var(--shadow-hairline)]">
      {chart.title ? (
        <h4 className="mb-2 text-2xs font-medium text-[var(--ink-2)]">
          {chart.title}
        </h4>
      ) : null}
      <div className="h-56 w-full">
        <ChartView data={chart} fill />
      </div>
    </div>
  );
}
