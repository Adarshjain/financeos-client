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
vi.mock('./ReportWidgetBody', () => ({
  ReportWidgetBody: ({ onOpenUnderlying }: { onOpenUnderlying?: () => void }) => (
    <button onClick={onOpenUnderlying} disabled={!onOpenUnderlying}>
      figure
    </button>
  ),
}));
vi.mock('./WidgetUnderlying', () => ({ WidgetUnderlying: () => <div data-testid="underlying" /> }));

import type { WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardWidgetFrame } from './DashboardWidgetFrame';

const report = { id: 'w1', kind: 'report', reportId: 'r1', title: null, layout: { x: 0, y: 0, w: 50, h: 24 }, report: { name: 'Spend', type: 'KPI', available: true } } as WidgetResponse;

beforeEach(() => {
  vi.clearAllMocks();
  useWidgetData.mockReturnValue({ available: true, isBuiltin: false, isTemplate: false, data: { type: 'KPI' }, loading: false, error: null, refetch: vi.fn() });
});

describe('a report widget\'s KPI figure', () => {
  it('opens the underlying data', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={report} />);
    await userEvent.click(screen.getByRole('button', { name: 'figure' }));
    expect(screen.getByTestId('underlying')).toBeInTheDocument();
  });

  it('is not pressable while editing (no menu, no underlying data)', () => {
    renderWithQuery(<DashboardWidgetFrame widget={report} editing />);
    expect(screen.getByRole('button', { name: 'figure' })).toBeDisabled();
  });
});
