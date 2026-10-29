import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { kpi, widget } from '@/features/dashboards/builtins/testFixtures';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { netWorthByKindRequest } from './netWorthBreakdownModel';
import { NetWorthView } from './NetWorthView';

const props = { widget: widget('net_worth'), data: kpi(1198842), onPageChange: vi.fn() };

describe('NetWorthView Cash · Invested · Cards · Loans line', () => {
  beforeEach(() => vi.resetAllMocks());

  it('runs the by-kind report beside the KPI and shows the four parts in compact rupees', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: {
        type: 'CHART',
        chartType: 'bar',
        dimension: 'kind',
        categories: ['bank_account', 'generic', 'broker', 'credit_card', 'loan'],
        series: [{ name: 'signedValue', data: [860000, 6000, 628000, -84800, -4190000] }],
        measure: { field: 'signedValue', aggregation: 'sum' },
        meta: { rowCount: 5, dateRange: null },
      },
    } as never);
    renderWithQuery(<NetWorthView {...props} />);
    const parts = await screen.findByTestId('net-worth-parts');
    expect(parts).toHaveTextContent('Cash ₹8.66L');
    expect(parts).toHaveTextContent('Invested ₹6.28L');
    expect(parts).toHaveTextContent('Cards ₹84.8K');
    expect(parts).toHaveTextContent('Loans ₹41.9L');
    expect(vi.mocked(api.POST).mock.calls[0][0]).toBe('/api/v1/reports/data');
    expect(vi.mocked(api.POST).mock.calls[0][1]).toMatchObject({ body: netWorthByKindRequest() });
  });

  it('the figure still shows, and no line, when the report fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('x'));
    renderWithQuery(<NetWorthView {...props} />);
    expect(screen.getByTestId('net-worth-value')).toHaveTextContent('₹11,98,842');
    await vi.waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(screen.queryByTestId('net-worth-parts')).not.toBeInTheDocument();
  });
});
