import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/organisms', () => ({
  Chart: (p: { months?: number; data: { chartType: string; categories: string[] }; onSelectEntry?: (e: { key: string; label: string; value: number }) => void }) => (
    <button
      type="button"
      data-testid="chart"
      data-type={p.data.chartType}
      data-months={p.months}
      data-categories={p.data.categories.join(',')}
      onClick={() => p.onSelectEntry?.({ key: '2026-10-09', label: '09/10/2026', value: 1250 })}
    />
  ),
}));
vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportUnderlyingDialog: (p: { request: unknown; title?: string; onClose: () => void }) => (
    <button type="button" data-testid="underlying" data-request={JSON.stringify(p.request)} data-title={p.title} onClick={p.onClose} />
  ),
}));

import { kpi, widget } from '@/features/dashboards/builtins/testFixtures';
import type { ChartData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { daySpendRequest } from './heatmap.requests';
import { SpendHeatmapView } from './SpendHeatmapView';

const chart = (categories: string[], values: (number | null)[]): ChartData =>
  ({
    type: 'CHART',
    chartType: 'bar',
    dimension: 'date',
    categories,
    series: [{ name: 'Spend', data: values }],
    measure: { field: 'spend', aggregation: 'sum' },
    meta: { dateRange: { from: '2026-10-01', to: '2026-10-10' } },
  }) as unknown as ChartData;

const view = (data: ChartData | ReturnType<typeof kpi>) => ({ widget: widget('spend_heatmap'), data, onPageChange: vi.fn() });

describe('SpendHeatmapView', () => {
  it('draws the data as a Chart heatmap', () => {
    renderWithQuery(<SpendHeatmapView {...view(chart(['2026-10-08', '2026-10-09'], [400, 1250]))} />);
    expect(screen.getByTestId('chart')).toHaveAttribute('data-type', 'heatmap');
    expect(screen.getByTestId('chart')).toHaveAttribute('data-categories', '2026-10-08,2026-10-09');
  });

  it('passes the widget\'s months param to the heatmap', () => {
    renderWithQuery(<SpendHeatmapView {...view(chart(['2026-10-09'], [1250]))} widget={widget('spend_heatmap', { months: 3 })} />);
    expect(screen.getByTestId('chart')).toHaveAttribute('data-months', '3');
  });

  it('a day press opens that day\'s spend, titled with the date and the amount', async () => {
    renderWithQuery(<SpendHeatmapView {...view(chart(['2026-10-09'], [1250]))} />);
    await userEvent.click(screen.getByTestId('chart'));
    const dialog = screen.getByTestId('underlying');
    expect(JSON.parse(dialog.getAttribute('data-request') as string)).toEqual(daySpendRequest('2026-10-09'));
    expect(dialog).toHaveAttribute('data-title', 'Spending on 09/10/2026 · ₹1,250');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('underlying')).not.toBeInTheDocument();
  });

  it('no spending in the period: an empty state, no chart', () => {
    renderWithQuery(<SpendHeatmapView {...view(chart(['2026-10-09'], [0]))} />);
    expect(screen.getByText('No spending in this period')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<SpendHeatmapView {...view(kpi(1))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
