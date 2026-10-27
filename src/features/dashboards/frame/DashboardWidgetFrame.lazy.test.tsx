import { act, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const useWidgetData = vi.hoisted(() => vi.fn());
vi.mock('../data/useWidgetData', () => ({ useWidgetData }));
const bodyMounted = vi.hoisted(() => vi.fn());
vi.mock('../builtins/registry', () => ({
  builtinPieces: (key: string) =>
    key === 'attention'
      ? {
          Body: () => {
            bodyMounted();
            return <div data-testid="body" />;
          },
          Skeleton: () => <div data-testid="builtin-skeleton" />,
        }
      : null,
  builtinHasParamsEditor: () => false,
  builtinParamsEditor: () => null,
}));
vi.mock('./ReportWidgetBody', () => ({ ReportWidgetBody: () => <div data-testid="report-body" /> }));

import type { WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardWidgetFrame } from './DashboardWidgetFrame';

type ObserverCallback = ConstructorParameters<typeof IntersectionObserver>[0];
type ObserverInit = ConstructorParameters<typeof IntersectionObserver>[1];

const observers: Array<{ callback: ObserverCallback; options?: ObserverInit }> = [];
class FakeIntersectionObserver {
  constructor(callback: ObserverCallback, options?: ObserverInit) {
    observers.push({ callback, options });
    return Object.assign(this, { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(), takeRecords: () => [] });
  }
}
const scrollIntoView = () => act(() => observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

const report: WidgetResponse = {
  id: 'w1',
  kind: 'report',
  reportId: 'r1',
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24 },
  report: { name: 'Spend this month', type: 'KPI', available: true },
} as WidgetResponse;
const component = {
  id: 'w-att',
  kind: 'builtin',
  reportId: null,
  builtinKey: 'attention',
  params: {},
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24 },
  builtin: { key: 'attention', label: 'Needs attention', minW: 25, kind: 'component', category: 'overview' },
} as unknown as WidgetResponse;

const lastEnabled = () => useWidgetData.mock.calls.at(-1)?.[4];

beforeEach(() => {
  vi.clearAllMocks();
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  useWidgetData.mockReturnValue({ available: true, isBuiltin: false, isTemplate: false, data: null, loading: false, error: null, refetch: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('DashboardWidgetFrame loads only in view', () => {
  it('a report widget out of view keeps its loading state and holds its query back; scrolling in enables it', () => {
    renderWithQuery(<DashboardWidgetFrame widget={report} />);
    expect(lastEnabled()).toBe(false);
    expect(screen.queryByTestId('report-body')).toBeNull();
    expect(observers[0].options).toEqual({ rootMargin: '200px' });
    scrollIntoView();
    expect(lastEnabled()).toBe(true);
  });

  it('a component built-in is not mounted (so it fetches nothing) until it is in view', () => {
    renderWithQuery(<DashboardWidgetFrame widget={component} />);
    expect(screen.getByTestId('builtin-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('body')).toBeNull();
    expect(bodyMounted).not.toHaveBeenCalled();
    scrollIntoView();
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(bodyMounted).toHaveBeenCalled();
  });

  it('stays loaded once it has been in view (one observer, no refetch gate again)', () => {
    renderWithQuery(<DashboardWidgetFrame widget={component} />);
    scrollIntoView();
    expect(observers).toHaveLength(1);
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('editing loads lazily too', () => {
    renderWithQuery(<DashboardWidgetFrame widget={report} editing />);
    expect(lastEnabled()).toBe(false);
    scrollIntoView();
    expect(lastEnabled()).toBe(true);
  });

  it('an unavailable widget still says so while out of view', () => {
    renderWithQuery(<DashboardWidgetFrame widget={{ ...report, report: { name: 'x', type: 'KPI', available: false } } as WidgetResponse} />);
    expect(screen.getByText('This report is no longer available')).toBeInTheDocument();
  });
});
