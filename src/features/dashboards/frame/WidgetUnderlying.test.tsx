import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
const dialog = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: (props: Record<string, unknown>) => {
    dialog(props);
    return <div data-testid="underlying-dialog" />;
  },
}));

import { catalogFixture, savedChart } from '@/features/reports/builder/editor.fixtures';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, ReportData, ReportResponse } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { NO_UNDERLYING, UNDERLYING_FAILED, WidgetUnderlying } from './WidgetUnderlying';

const widget = (type: 'KPI' | 'CHART' | 'TABLE' = 'CHART'): WidgetResponse => ({
  id: 'w1',
  kind: 'report',
  reportId: 'r1',
  title: 'Where it goes',
  layout: { x: 0, y: 0, w: 50, h: 24 },
  report: { name: 'Spend by category', type, available: true },
});

const chartData: ChartData = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food & dining', 'Rent'],
  series: [{ name: 'Spend', data: [42180, 56812] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 2, dateRange: null },
} as ChartData;

function serve(report: ReportResponse | null | 'fail') {
  api.GET.mockImplementation(async (path: string) => {
    if (path === '/api/v1/reports/{id}') {
      if (report === 'fail') throw new Error('down');
      return { data: report };
    }
    return { data: catalogFixture };
  });
}

const onClose = vi.fn();
beforeEach(() => vi.clearAllMocks());

describe('WidgetUnderlying', () => {
  it('opens a chart widget on the whole report with its categories as the entry dropdown', async () => {
    serve(savedChart);
    renderWithQuery(<WidgetUnderlying widget={widget()} data={chartData as ReportData} onClose={onClose} />);
    expect(await screen.findByTestId('underlying-dialog')).toBeInTheDocument();
    const props = dialog.mock.calls.at(-1)![0];
    expect(props.title).toBe('Underlying data · Where it goes');
    expect(props.request).toMatchObject({ type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum' } });
    expect(props.entries.map((e: { label: string }) => e.label)).toEqual(['Food & dining', 'Rent']);
    expect(props.dimensionLabel).toBe('Category');
  });

  it('a KPI widget opens on its own figure, without entries', async () => {
    serve({ ...savedChart, type: 'KPI', definition: { measure: 'spend', aggregation: 'sum', filters: [] } });
    renderWithQuery(<WidgetUnderlying widget={widget('KPI')} data={null} onClose={onClose} />);
    await screen.findByTestId('underlying-dialog');
    const props = dialog.mock.calls.at(-1)![0];
    expect(props.request).toMatchObject({ type: 'KPI' });
    expect(props.entries).toBeUndefined();
  });

  it('an aggregated table has underlying data too', async () => {
    serve({
      ...savedChart,
      type: 'TABLE',
      definition: { mode: 'aggregated', rowDimensions: [{ field: 'category' }], measures: [{ field: 'spend', aggregation: 'sum' }], filters: [] },
    } as unknown as ReportResponse);
    renderWithQuery(<WidgetUnderlying widget={widget('TABLE')} data={null} onClose={onClose} />);
    await screen.findByTestId('underlying-dialog');
    expect(dialog.mock.calls.at(-1)![0].request).toMatchObject({ type: 'KPI', definition: { measure: 'spend' } });
  });

  it('a report with no figure to list (a raw table) says so and closes', async () => {
    serve({ ...savedChart, type: 'TABLE', definition: { mode: 'raw', columns: ['date'], filters: [], sort: [] } } as unknown as ReportResponse);
    renderWithQuery(<WidgetUnderlying widget={widget('TABLE')} data={null} onClose={onClose} />);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(NO_UNDERLYING, { tone: 'danger' }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId('underlying-dialog')).toBeNull();
  });

  it('a report that cannot be read says so and closes', async () => {
    serve('fail');
    renderWithQuery(<WidgetUnderlying widget={widget()} data={null} onClose={onClose} />);
    await waitFor(() => expect(toast).toHaveBeenCalledWith(UNDERLYING_FAILED, { tone: 'danger' }));
    expect(onClose).toHaveBeenCalled();
  });
});
