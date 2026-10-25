import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/ds/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const useWidgetData = vi.hoisted(() => vi.fn());
vi.mock('../data/useWidgetData', () => ({ useWidgetData }));
const target = { request: { type: 'KPI', datasource: 'transactions', definition: { marker: 1 } }, category: 1 };
vi.mock('./ReportWidgetBody', () => ({
  ReportWidgetBody: ({ onOpenUnderlyingTarget }: { onOpenUnderlyingTarget?: (t: unknown) => void }) => (
    <button onClick={() => onOpenUnderlyingTarget?.(target)} disabled={!onOpenUnderlyingTarget}>
      bar
    </button>
  ),
}));
const underlying = vi.hoisted(() => vi.fn());
vi.mock('./WidgetUnderlying', () => ({
  WidgetUnderlying: (props: Record<string, unknown>) => {
    underlying(props);
    return <div data-testid="underlying" />;
  },
}));

import type { WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardWidgetFrame } from './DashboardWidgetFrame';

const report = { id: 'w1', kind: 'report', reportId: 'r1', title: null, layout: { x: 0, y: 0, w: 50, h: 24 }, report: { name: 'Spend', type: 'CHART', available: true } } as WidgetResponse;

beforeEach(() => {
  vi.clearAllMocks();
  useWidgetData.mockReturnValue({ available: true, isBuiltin: false, isTemplate: false, data: { type: 'CHART' }, loading: false, error: null, refetch: vi.fn() });
});

describe('a report widget\'s chart entry', () => {
  it('opens the underlying dialog on the pressed entry\'s target', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={report} />);
    await userEvent.click(screen.getByRole('button', { name: 'bar' }));
    expect(screen.getByTestId('underlying')).toBeInTheDocument();
    expect(underlying.mock.calls.at(-1)![0].target).toBe(target);
  });

  it('is not pressable while editing', () => {
    renderWithQuery(<DashboardWidgetFrame widget={report} editing />);
    expect(screen.getByRole('button', { name: 'bar' })).toBeDisabled();
  });
});
