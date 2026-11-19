import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { ChartData } from '@/lib/reports.types';

import { ChartBreakdown } from './ChartBreakdown';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const data = (subLabels: string[]): ChartData => ({
  type: 'CHART',
  chartType: 'breakdown',
  dimension: 'category',
  categories: ['Food', 'Travel'],
  series: [{ name: 'Spend', data: [400, 200] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 30, dateRange: null },
  other: null,
  breakdown: {
    rows: [
      { count: 20, avg: 20, previousCount: null, subRows: subLabels.map((label, i) => ({ label, value: 100 + i, count: 5 })) },
      { count: 6, avg: 33, previousCount: null, subRows: [] },
    ],
    total: 600,
    previousTotal: null,
  },
});

describe('ChartBreakdown sub-row labels', () => {
  it('shows a sub-category without its category prefix', async () => {
    render(<ChartBreakdown data={data(['Food · Delivery', 'Food · Others'])} money />);
    await user.click(screen.getByText('Food'));
    expect(screen.getByText('Delivery · 5 transactions')).toBeInTheDocument();
    expect(screen.getByText('Others · 5 transactions')).toBeInTheDocument();
    expect(screen.queryByText('Food · Delivery', { exact: false })).not.toBeInTheDocument();
  });

  it('keeps a sub-row label that has no parent prefix', async () => {
    render(<ChartBreakdown data={data(['Swiggy', 'Travel · Taxi'])} money />);
    await user.click(screen.getByText('Food'));
    expect(screen.getByText('Swiggy · 5 transactions')).toBeInTheDocument();
    expect(screen.getByText('Travel · Taxi · 5 transactions')).toBeInTheDocument();
  });
});
