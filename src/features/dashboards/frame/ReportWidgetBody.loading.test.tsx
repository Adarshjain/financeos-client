import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/features/reports/view/ReportResult', () => ({ ReportResult: () => <div data-testid="result" /> }));
const chart = vi.hoisted(() => ({ ready: false, wanted: vi.fn() }));
vi.mock('@/lib/lazy/LazyChart', () => ({
  useChartReady: (wanted: boolean) => {
    chart.wanted(wanted);
    return chart.ready;
  },
}));

import { catalogFixture, savedChart } from '@/features/reports/builder/editor.fixtures';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, KpiData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportWidgetBody } from './ReportWidgetBody';
import type { ReportWidgetState } from './useReportWidget';

const widget: WidgetResponse = { id: 'w1', kind: 'report', reportId: 'r1', title: null, layout: { x: 0, y: 0, w: 50, h: 24 }, report: { name: 'x', type: 'CHART', available: true } };
const state = (data: unknown): ReportWidgetState => ({ data, loading: false, sort: null, setSort: vi.fn(), setPage: vi.fn(), setSize: vi.fn() }) as unknown as ReportWidgetState;
const pulses = (c: HTMLElement) => [...c.querySelectorAll('.animate-pulse')].map((e) => (e as HTMLElement).style.width);

beforeEach(() => {
  vi.clearAllMocks();
  chart.ready = false;
  api.GET.mockImplementation(async (path: string) => (path === '/api/v1/reports/{id}' ? { data: savedChart } : { data: catalogFixture }));
});

describe('ReportWidgetBody loading', () => {
  it('waits for the report and catalog under the widget\'s own three-line skeleton, never a different block', () => {
    api.GET.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'KPI' } as KpiData)} />);
    expect(screen.queryByTestId('result')).toBeNull();
    expect(pulses(container)).toEqual(['80%', '60%', '70%']);
    expect(container.querySelector('[style*="height: 96px"]')).toBeNull();
  });

  it('keeps that skeleton for a chart until the chart code is in, and asks for the code once the data is a chart', async () => {
    const { container } = renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'CHART', chartType: 'bar' } as ChartData)} />);
    await vi.waitFor(() => expect(api.GET).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('result')).toBeNull();
    expect(pulses(container)).toEqual(['80%', '60%', '70%']);
    expect(chart.wanted).toHaveBeenLastCalledWith(true);
  });

  it('shows the chart result once its code is in', async () => {
    chart.ready = true;
    renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'CHART', chartType: 'bar' } as ChartData)} />);
    expect(await screen.findByTestId('result')).toBeInTheDocument();
  });

  it('does not wait for the chart code, or fetch it, for a KPI', async () => {
    renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'KPI' } as KpiData)} />);
    expect(await screen.findByTestId('result')).toBeInTheDocument();
    expect(chart.wanted).not.toHaveBeenCalledWith(true);
  });
});
