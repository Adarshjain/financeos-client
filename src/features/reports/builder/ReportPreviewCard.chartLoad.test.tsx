import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/reports/view/ReportResult', () => ({ ReportResult: () => <div data-testid="result" /> }));
const chart = vi.hoisted(() => ({ ready: false, wanted: vi.fn() }));
vi.mock('@/lib/lazy/LazyChart', () => ({
  useChartReady: (wanted: boolean) => {
    chart.wanted(wanted);
    return chart.ready;
  },
}));

import type { ChartData, DatasourceCatalog, RunReportRequest } from '@/lib/reports.types';

import { catalogFixture } from './editor.fixtures';
import { ReportPreviewCard } from './ReportPreviewCard';
import type { PreviewState } from './useReportPreview';

const ds = catalogFixture.datasources[0];
const catalog: DatasourceCatalog = { fields: ds.fields, operators: catalogFixture.operators };
const request = { type: 'CHART', datasource: 'transactions', definition: { chartType: 'bar', filters: [] } } as unknown as RunReportRequest;
const chartData = { type: 'CHART', chartType: 'bar', categories: ['A'], series: [{ name: 'S', data: [1] }], meta: { rowCount: 1, dateRange: null } } as unknown as ChartData;
const kpiData = { type: 'KPI', value: 1, meta: { rowCount: 1, dateRange: null } } as never;
const state = (data: unknown) => ({ shown: { data, request, signature: 's', page: 0, size: 25, sort: null }, loading: false, error: null, stale: false }) as unknown as PreviewState;
const card = (p: PreviewState) => render(<ReportPreviewCard preview={p} catalog={catalog} missing={[]} onPreview={vi.fn()} />);

describe('ReportPreviewCard chart load', () => {
  it('keeps the loading skeleton for a chart result until the chart code is in, and asks for the code', () => {
    chart.ready = false;
    const { container } = card(state(chartData));
    expect(screen.queryByTestId('result')).toBeNull();
    // One block, the same height as the editor's loading shape holds for the preview.
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1);
    expect((container.querySelector('.animate-pulse') as HTMLElement).style.height).toBe('200px');
    expect(chart.wanted).toHaveBeenLastCalledWith(true);
  });

  it('shows the chart result once its code is in', () => {
    chart.ready = true;
    card(state(chartData));
    expect(screen.getByTestId('result')).toBeInTheDocument();
  });

  it('shows a KPI result at once, without waiting for or asking for the chart code', () => {
    chart.ready = false;
    chart.wanted.mockClear();
    card(state(kpiData));
    expect(screen.getByTestId('result')).toBeInTheDocument();
    expect(chart.wanted).toHaveBeenLastCalledWith(false);
  });
});
