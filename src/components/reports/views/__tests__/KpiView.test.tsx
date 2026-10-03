import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KpiView } from '@/components/reports/views/KpiView';
import type { KpiComparison, KpiData } from '@/lib/reports.types';
import { formatDate } from '@/lib/utils';

const kpi = (overrides: Partial<KpiData> = {}): KpiData => ({
  type: 'KPI',
  value: 1000,
  measure: 'amount',
  aggregation: 'sum',
  format: 'number',
  comparison: null,
  meta: { rowCount: 3, dateRange: { from: '2026-09-01', to: '2026-09-30' } },
  ...overrides,
});

const comparison = (previousDateRange: KpiComparison['previousDateRange']): KpiComparison => ({
  previousValue: 800,
  previousDateRange,
  change: 200,
  changePercent: 25,
  direction: 'up',
  sentiment: 'good',
});

describe('KpiView date line', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T06:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows only the compact range when there is no comparison', () => {
    render(<KpiView data={kpi()} />);
    const line = screen.getByText('Sep');
    expect(line.textContent).toBe('Sep');
    expect(screen.queryByText(/vs/)).toBeNull();
    expect(line.getAttribute('title')).toBe(
      `${formatDate('2026-09-01')} – ${formatDate('2026-09-30')}`,
    );
  });

  it('appends the compact compared window', () => {
    render(
      <KpiView data={kpi({ comparison: comparison({ from: '2026-08-01', to: '2026-08-31' }) })} />,
    );
    const line = screen.getByText('Sep vs Aug');
    expect(line.getAttribute('title')).toBe(
      `${formatDate('2026-09-01')} – ${formatDate('2026-09-30')} vs ` +
        `${formatDate('2026-08-01')} – ${formatDate('2026-08-31')}`,
    );
  });

  it('uses the generic phrase when the compared window is unknown', () => {
    render(<KpiView data={kpi({ comparison: comparison(null) })} />);
    expect(screen.getByText('Sep vs previous period')).toBeTruthy();
  });

  it('omits the line when the range is unbounded', () => {
    render(<KpiView data={kpi({ meta: { rowCount: 3, dateRange: null } })} />);
    expect(screen.queryByText('Sep')).toBeNull();
  });

  it('keeps full previous dates and value in the delta hover', () => {
    render(
      <KpiView data={kpi({ comparison: comparison({ from: '2026-08-01', to: '2026-08-31' }) })} />,
    );
    const delta = screen.getByText(/\+25\.0%/).parentElement!;
    expect(delta.getAttribute('title')).toMatch(
      new RegExp(`^vs ${formatDate('2026-08-01')} – ${formatDate('2026-08-31')}: .*800`),
    );
  });
});
