import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/date-range', async (orig) => ({ ...(await orig<typeof import('@/lib/date-range')>()), todayInAppZone: () => '2026-10-13' }));

import type { ChartData } from '@/lib/reports.types';

import { Chart } from './Chart';

const data = {
  type: 'CHART',
  chartType: 'heatmap',
  dimension: 'date',
  categories: ['2026-10-09'],
  series: [{ name: 'Spend', data: [1250] }],
  measure: { field: 'spend', aggregation: 'sum' },
} as unknown as ChartData;

const weeks = () => Number(screen.getByTestId('heatmap-grid').getAttribute('data-weeks'));

describe('Chart heatmap months', () => {
  it('covers 6 months by default and as many as the months prop says', () => {
    const { unmount } = render(<Chart data={data} money />);
    const sixMonths = weeks();
    unmount();
    render(<Chart data={data} money months={2} />);
    const twoMonths = weeks();
    expect(twoMonths).toBeLessThan(sixMonths);
    expect(twoMonths).toBeGreaterThanOrEqual(8);
    expect(twoMonths).toBeLessThanOrEqual(10);
  });
});
