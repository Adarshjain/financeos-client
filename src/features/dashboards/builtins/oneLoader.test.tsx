import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Chart's code is held back by a deferred import. Each test gets a fresh module registry (LazyChart remembers a loaded
// chart), so each can watch what shows while the code is on its way and when it lands.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({ LazyReportUnderlyingDialog: () => null, LazyReportRowBreakdownDialog: () => null }));
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({ ReportUnderlyingDialog: () => null }));
const gate = vi.hoisted(() => ({ release: () => {}, started: 0 }));
import type { ChartData } from '@/lib/reports.types';

import { account, bodyProps, widget } from './testFixtures';

const heat = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'date',
  categories: ['2026-10-09'],
  series: [{ name: 'Spend', data: [1250] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { dateRange: { from: '2026-10-01', to: '2026-10-10' } },
} as unknown as ChartData;
const pie = { ...heat, chartType: 'pie', dimension: 'assetClass', categories: ['EQUITY'], series: [{ name: 'currentValue', data: [10] }] } as unknown as ChartData;

/** The widget's own skeleton shows (and the chart-frame one does not) until the code lands; then the chart replaces it. */
async function expectOneLoader(skeletonId: string, container: HTMLElement) {
  await vi.waitFor(() => expect(gate.started).toBe(1));
  expect(screen.getByTestId(skeletonId)).toBeInTheDocument();
  expect(container.querySelector('.aspect-video')).toBeNull();
  expect(screen.queryByTestId('chart')).toBeNull();
  gate.release();
  expect(await screen.findByTestId('chart')).toBeInTheDocument();
  expect(screen.queryByTestId(skeletonId)).toBeNull();
}

beforeEach(async () => {
  vi.resetModules();
  gate.started = 0;
  vi.doMock('@/components/organisms/Chart/Chart', async () => {
    gate.started += 1;
    await new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    return { Chart: () => <div data-testid="chart" /> };
  });
  const { api } = await import('@/lib/api/client');
  vi.mocked(api.GET).mockReset();
});

describe('built-in chart widgets show one loading state, then the chart', () => {
  it('Allocation', async () => {
    const { renderWithQuery } = await import('@/test/renderWithQuery');
    const { AllocationView } = await import('./allocation/AllocationView');
    const { container } = renderWithQuery(<AllocationView widget={widget('allocation')} data={pie} onPageChange={() => {}} />);
    await expectOneLoader('allocation-loading', container);
  });

  it('Spend heatmap', async () => {
    const { renderWithQuery } = await import('@/test/renderWithQuery');
    const { SpendHeatmapView } = await import('./spend-heatmap/SpendHeatmapView');
    const { container } = renderWithQuery(<SpendHeatmapView widget={widget('spend_heatmap')} data={heat} onPageChange={() => {}} />);
    await vi.waitFor(() => expect(gate.started).toBe(1));
    expect(container.querySelector('.aspect-video')).toBeNull();
    expect(screen.queryByTestId('spend-heatmap-view')).toBeNull();
    gate.release();
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
  });

  it('Emergency fund', async () => {
    const { api } = await import('@/lib/api/client');
    const { renderWithQuery } = await import('@/test/renderWithQuery');
    const { EmergencyFundBody } = await import('./emergency-fund/EmergencyFundBody');
    vi.mocked(api.GET).mockResolvedValue({
      data: {
        liquidBalance: 1000,
        accounts: [{ id: 'b1', name: 'HDFC', type: 'bank_account', balance: 1000 }],
        months: [{ month: '2026-09', outflow: 500, beforeHistory: false }],
        historyMonths: 1,
        medianOutflow: 500,
        monthsCovered: 2,
        band: 'low',
      },
    } as never);
    const { container } = renderWithQuery(<EmergencyFundBody {...bodyProps('emergency_fund')} />);
    await vi.waitFor(() => expect(gate.started).toBe(1));
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('emergency-fund')).toBeNull();
    expect(container.querySelector('.aspect-video')).toBeNull();
    gate.release();
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-skeleton')).toBeNull();
  });

  it('Account tile: the tile text waits for the series and the chart code', async () => {
    const { api } = await import('@/lib/api/client');
    const { renderWithQuery } = await import('@/test/renderWithQuery');
    const { AccountTileBody } = await import('./account-tile/AccountTileBody');
    vi.mocked(api.GET).mockImplementation(((path: string) =>
      Promise.resolve({
        data: path.includes('balance-series')
          ? [
              { date: '2026-10-01', balance: 100 },
              { date: '2026-10-02', balance: 120 },
            ]
          : account({ id: 'a1', name: 'HDFC Savings', balance: 125000 }),
      })) as never);
    const { container } = renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    await vi.waitFor(() => expect(gate.started).toBe(1));
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('account-tile')).toBeNull();
    expect(container.querySelector('.aspect-video')).toBeNull();
    gate.release();
    expect(await screen.findByTestId('account-trend')).toBeInTheDocument();
    expect(screen.getByTestId('account-tile')).toHaveTextContent('HDFC Savings');
    expect(screen.queryByTestId('widget-skeleton')).toBeNull();
  });

  it('Account tile without a trend (a broker) never asks for the chart code', async () => {
    const { api } = await import('@/lib/api/client');
    const { renderWithQuery } = await import('@/test/renderWithQuery');
    const { AccountTileBody } = await import('./account-tile/AccountTileBody');
    vi.mocked(api.GET).mockResolvedValue({ data: account({ id: 'a1', name: 'Zerodha', type: 'broker' as never, balance: 5 }) } as never);
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    expect(await screen.findByTestId('account-tile')).toHaveTextContent('Zerodha');
    expect(gate.started).toBe(0);
  });
});
