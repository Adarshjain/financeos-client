import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
const result = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/view/ReportResult', () => ({
  ReportResult: (props: Record<string, unknown>) => {
    result(props);
    return <div data-testid="result" />;
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

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) => (path === '/api/v1/reports/{id}' ? { data: savedChart } : { data: catalogFixture }));
});

describe('ReportWidgetBody', () => {
  it('shows the result with the report\'s datasource catalog and, for a chart, its definition', async () => {
    renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'CHART', chartType: 'bar' } as ChartData)} />);
    expect(await screen.findByTestId('result')).toBeInTheDocument();
    const props = result.mock.calls.at(-1)![0];
    expect(props.catalog.fields.map((f: { name: string }) => f.name)).toContain('spend');
    expect(props.definition).toMatchObject({ chartType: 'bar' });
  });

  it('gives a KPI no chart definition', async () => {
    renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'KPI' } as KpiData)} />);
    await screen.findByTestId('result');
    expect(result.mock.calls.at(-1)![0].definition).toBeUndefined();
  });

  it('leaves the measure overline out and passes the underlying-data opener to the KPI figure', async () => {
    const open = vi.fn();
    renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'KPI' } as KpiData)} onOpenUnderlying={open} />);
    await screen.findByTestId('result');
    const props = result.mock.calls.at(-1)![0];
    expect(props.hideMeasure).toBe(true);
    expect(props.onOpenKpi).toBe(open);
  });

  it('draws a KPI without a card of its own: the widget already is one', async () => {
    renderWithQuery(<ReportWidgetBody widget={widget} state={state({ type: 'KPI' } as KpiData)} />);
    await screen.findByTestId('result');
    expect(result.mock.calls.at(-1)![0].kpiVariant).toBe('plain');
  });

  it('waits for the data, then for the labels, instead of flashing field names', async () => {
    const { rerender } = renderWithQuery(<ReportWidgetBody widget={widget} state={state(null)} />);
    expect(screen.queryByTestId('result')).toBeNull();
    rerender(<ReportWidgetBody widget={widget} state={state({ type: 'KPI' } as KpiData)} />);
    expect(screen.queryByTestId('result')).toBeNull();
    expect(await screen.findByTestId('result')).toBeInTheDocument();
  });
});
