import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/ds/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));
const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api };
});
const useWidgetData = vi.hoisted(() => vi.fn());
vi.mock('../data/useWidgetData', () => ({ useWidgetData }));
vi.mock('../builtins/net_worth/useNetWorthParts', () => ({ useNetWorthParts: () => ({ data: null }) }));
const dialog = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportUnderlyingDialog: (props: Record<string, unknown>) => {
    dialog(props);
    return <div data-testid="underlying-dialog" />;
  },
  LazyReportRowBreakdownDialog: () => null,
}));

import type { WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardWidgetFrame } from './DashboardWidgetFrame';

const builtin = (key: string, kind: 'template' | 'component', params = {}): WidgetResponse =>
  ({
    id: 'w1',
    kind: 'builtin',
    reportId: null,
    builtinKey: key,
    params,
    title: null,
    layout: { x: 0, y: 0, w: 50, h: 24 },
    builtin: { key, label: key, minW: 50, kind, href: null, category: 'overview', key_: key },
  }) as unknown as WidgetResponse;

const kpiData = {
  type: 'KPI',
  value: 1234567,
  measure: 'balance',
  aggregation: 'sum',
  comparison: null,
  meta: { rowCount: 1, dateRange: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  useWidgetData.mockReturnValue({ available: true, isBuiltin: true, isTemplate: true, data: kpiData, loading: false, error: null, refetch: vi.fn() });
});

describe('Net worth built-in underlying data', () => {
  it('shows the value as a link; tapping opens the dialog with the builtin source and params, fetching nothing before', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('net_worth', 'template', { accountIds: ['a1'] })} />);
    expect(screen.queryByTestId('underlying-dialog')).not.toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByTestId('net-worth-value')).getByRole('button'));
    expect(screen.getByTestId('underlying-dialog')).toBeInTheDocument();
    expect(dialog.mock.calls[0][0]).toMatchObject({ builtin: { kind: 'builtin', key: 'net_worth', params: { accountIds: ['a1'] } } });
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('the ⋮ menu has View underlying data and opens the same dialog', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('net_worth', 'template')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Widget options' }));
    await userEvent.click(await screen.findByText('View underlying data'));
    expect(dialog.mock.calls[0][0]).toMatchObject({ builtin: { key: 'net_worth' } });
  });

  it('is not a link while editing', () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('net_worth', 'template')} editing />);
    expect(within(screen.getByTestId('net-worth-value')).queryByRole('button')).toBeNull();
  });
});
