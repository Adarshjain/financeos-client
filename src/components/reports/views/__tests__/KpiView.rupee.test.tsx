import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { KpiData } from '@/lib/reports.types';

import { KpiView } from '../KpiView';
import { ReportDataView } from '../ReportDataView';

// The user's saved KPI: transactions amount, summed over the last 2 years, no comparison.
const spend: KpiData = {
  type: 'KPI',
  value: -123456.5,
  measure: 'amount',
  aggregation: 'sum',
  format: 'currency',
  comparison: null,
  meta: { rowCount: 1559, dateRange: { from: '2024-10-10', to: '2026-10-10' } },
};

// The built-in net worth KPI: a measure whose name says nothing about money.
const netWorth: KpiData = {
  type: 'KPI',
  value: 15500,
  measure: 'value',
  aggregation: 'sum',
  format: 'currency',
  comparison: null,
  meta: { rowCount: 3, dateRange: null },
};

const withComparison = (display: 'change' | 'previous_value'): KpiData => ({
  ...netWorth,
  comparison: {
    previousValue: 12000,
    previousDateRange: { from: '2026-09-01', to: '2026-09-30' },
    change: 3500,
    changePercent: 29.2,
    direction: 'up',
    sentiment: 'good',
    display,
  },
});

describe('KPI values carry the rupee symbol', () => {
  it.each([
    ['the builder preview / chat (default variant)', undefined],
    ['a dashboard widget', 'widget' as const],
  ])('a summed amount on %s', (_, variant) => {
    render(<KpiView data={spend} variant={variant} />);
    expect(screen.getByText('-₹1,23,456.50')).toBeInTheDocument();
  });

  it('the net worth value, whose measure is not named like money', () => {
    render(<KpiView data={netWorth} variant="widget" />);
    expect(screen.getByText('₹15,500.00')).toBeInTheDocument();
  });

  it('the tappable value that opens the underlying data', () => {
    render(<KpiView data={spend} variant="widget" onValueClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'View underlying data' })).toHaveTextContent('-₹1,23,456.50');
  });

  it('the change and the previous value on the comparison line', () => {
    const { unmount } = render(<KpiView data={withComparison('change')} variant="widget" />);
    expect(screen.getByText('+₹3,500.00 (+29.2%)')).toBeInTheDocument();
    unmount();
    render(<KpiView data={withComparison('previous_value')} />);
    expect(screen.getByText('prev ₹12,000.00')).toBeInTheDocument();
  });

  it.each([
    ['a dashboard widget (fill)', true],
    ['the builder preview (flow)', false],
  ])('through ReportDataView in %s', (_, fill) => {
    render(<ReportDataView data={spend} fill={fill} />);
    expect(screen.getByText('-₹1,23,456.50')).toBeInTheDocument();
  });

  it('but a count stays a plain number', () => {
    render(<KpiView data={{ ...spend, aggregation: 'count', value: 1559 }} variant="widget" />);
    expect(screen.getByText('1,559')).toBeInTheDocument();
  });
});
