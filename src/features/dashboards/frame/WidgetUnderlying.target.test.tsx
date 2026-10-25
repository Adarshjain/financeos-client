import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
const dialog = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: (props: Record<string, unknown>) => {
    dialog(props);
    return <div data-testid="underlying-dialog" />;
  },
}));

import { catalogFixture, savedChart } from '@/features/reports/builder/editor.fixtures';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, ReportData, RunReportRequest } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { WidgetUnderlying } from './WidgetUnderlying';

const widget: WidgetResponse = { id: 'w1', kind: 'report', reportId: 'r1', title: 'Where it goes', layout: { x: 0, y: 0, w: 50, h: 24 }, report: { name: 'Spend', type: 'CHART', available: true } };
const chartData = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food & dining', 'Rent'],
  series: [{ name: 'Spend', data: [1, 2] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 2, dateRange: null },
} as ChartData;
const pinned: RunReportRequest = { type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum', filters: [] } };

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) => (path === '/api/v1/reports/{id}' ? { data: savedChart } : { data: catalogFixture }));
});

describe('WidgetUnderlying target', () => {
  it('opens on the entry of a category target, keeping the dropdown, under the widget title', async () => {
    renderWithQuery(<WidgetUnderlying widget={widget} data={chartData as ReportData} target={{ request: pinned, category: 1 }} onClose={vi.fn()} />);
    await screen.findByTestId('underlying-dialog');
    const props = dialog.mock.calls.at(-1)![0];
    expect(props.title).toBe('Underlying data · Where it goes');
    expect(props.entries.map((e: { label: string }) => e.label)).toEqual(['Food & dining', 'Rent']);
    expect(props.initialEntry).toBe(1);
  });

  it('opens a final target as it is, with no dropdown', async () => {
    renderWithQuery(<WidgetUnderlying widget={widget} data={chartData as ReportData} target={{ request: pinned }} onClose={vi.fn()} />);
    await screen.findByTestId('underlying-dialog');
    const props = dialog.mock.calls.at(-1)![0];
    expect(props.request).toBe(pinned);
    expect(props.entries).toBeUndefined();
    expect(props.initialEntry).toBeUndefined();
  });

  it('opens the target\'s own pinned request, with no dropdown, when the dropdown has no such entry', async () => {
    const own: RunReportRequest = { type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum', filters: [{ field: 'category', operator: 'is', value: 'Gone' }] } };
    renderWithQuery(<WidgetUnderlying widget={widget} data={chartData as ReportData} target={{ request: pinned, category: 7, pinned: own }} onClose={vi.fn()} />);
    await screen.findByTestId('underlying-dialog');
    const props = dialog.mock.calls.at(-1)![0];
    expect(props.request).toBe(own);
    expect(props.entries).toBeUndefined();
    expect(props.initialEntry).toBeUndefined();
  });

  it('does the same while the widget has no data to list entries from', async () => {
    const own: RunReportRequest = { type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum', filters: [] } };
    renderWithQuery(<WidgetUnderlying widget={widget} data={null} target={{ request: pinned, category: 1, pinned: own }} onClose={vi.fn()} />);
    await screen.findByTestId('underlying-dialog');
    expect(dialog.mock.calls.at(-1)![0].request).toBe(own);
  });
});
