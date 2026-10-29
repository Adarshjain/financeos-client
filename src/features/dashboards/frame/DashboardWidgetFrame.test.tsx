import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/dashboards/d1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async () => ({ ...(await vi.importActual<object>('@/components/ds/Toast/Toast')), showToast }));

const useWidgetData = vi.hoisted(() => vi.fn());
vi.mock('../data/useWidgetData', () => ({ useWidgetData }));
vi.mock('../builtins/registry', () => ({
  builtinPieces: (key: string) =>
    key === 'upcoming'
      ? { View: ({ data }: { data: { label: string } }) => <div data-testid="view">{data.label}</div>, Skeleton: () => <div data-testid="builtin-skeleton" /> }
      : key === 'attention'
        ? { Body: () => <div data-testid="body" />, Skeleton: () => <div data-testid="builtin-skeleton" /> }
        : null,
  builtinHasParamsEditor: () => false,
  builtinParamsEditor: () => null,
}));
vi.mock('./ReportWidgetBody', () => ({ ReportWidgetBody: () => <div data-testid="report-body" /> }));
vi.mock('./WidgetUnderlying', () => ({ WidgetUnderlying: () => <div data-testid="underlying" /> }));

import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardWidgetFrame, LOAD_FAILED_TITLE, REPORT_GONE, REPORT_GONE_TITLE } from './DashboardWidgetFrame';

const report = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'w1',
  kind: 'report',
  reportId: 'r1',
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24 },
  report: { name: 'Spend this month', type: 'KPI', available: true },
  ...over,
});
const builtin = (key: string, kind: 'template' | 'component', over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: `w-${key}`,
  kind: 'builtin',
  reportId: null,
  builtinKey: key,
  params: {},
  title: null,
  layout: { x: 0, y: 0, w: 100, h: 24 },
  builtin: { key, label: key === 'upcoming' ? 'Upcoming' : 'Inbox', minW: 50, kind, href: key === 'upcoming' ? '/upcoming' : '/inbox', category: 'overview', subtitle: 'Next 14 days' } as WidgetResponse['builtin'],
  ...over,
});

const loaded = (over: Record<string, unknown> = {}) => ({
  available: true,
  isBuiltin: false,
  isTemplate: false,
  data: { type: 'KPI', label: 'Net worth' },
  loading: false,
  error: null,
  refetch: vi.fn(),
  ...over,
});

const catalog: BuiltinWidgetResponse[] = [
  { key: 'upcoming', label: 'Upcoming', description: '', category: 'overview', kind: 'template', minW: 100, params: [{ name: 'days', type: 'int', required: false, min: 1, max: 90, defaultValue: 14 }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  useWidgetData.mockReturnValue(loaded());
});

describe('DashboardWidgetFrame states', () => {
  it('shows the built-in\'s own skeleton while its data loads', () => {
    useWidgetData.mockReturnValue(loaded({ data: null, isBuiltin: true, isTemplate: true }));
    renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template')} />);
    expect(screen.getByTestId('builtin-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('a report widget shows the generic skeleton while it loads', () => {
    useWidgetData.mockReturnValue(loaded({ data: null }));
    renderWithQuery(<DashboardWidgetFrame widget={report()} />);
    expect(screen.queryByTestId('report-body')).toBeNull();
    expect(screen.queryByText(LOAD_FAILED_TITLE)).toBeNull();
  });

  it('a failed load says what failed and Retry loads it again', async () => {
    const refetch = vi.fn();
    useWidgetData.mockReturnValue(loaded({ data: null, error: 'Prices service did not answer.', refetch }));
    renderWithQuery(<DashboardWidgetFrame widget={report()} />);
    expect(screen.getByText(LOAD_FAILED_TITLE)).toBeInTheDocument();
    expect(screen.getByText(/Prices service did not answer\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('a deleted report says so, offers no Retry and no menu', () => {
    useWidgetData.mockReturnValue(loaded({ available: false, data: null }));
    renderWithQuery(<DashboardWidgetFrame widget={report({ report: { available: false } })} />);
    expect(screen.getByText(REPORT_GONE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(REPORT_GONE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Widget options' })).toBeNull();
  });

  it('a built-in the server no longer has says it is no longer available', () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('gone', 'template', { builtin: undefined })} />);
    expect(screen.getByText('This widget is no longer available.')).toBeInTheDocument();
  });

  it('a built-in this client has no pieces for (version skew) shows the unavailable state, not a skeleton', () => {
    useWidgetData.mockReturnValue(loaded({ data: null, isBuiltin: true, isTemplate: true }));
    renderWithQuery(<DashboardWidgetFrame widget={builtin('newer_than_client', 'template')} />);
    expect(screen.getByText('This widget is no longer available.')).toBeInTheDocument();
    expect(screen.queryByTestId('report-body')).toBeNull();
  });

  it('renders a report with ReportResult\'s body, a component built-in with its body, a template with its view', () => {
    const { unmount } = renderWithQuery(<DashboardWidgetFrame widget={report()} />);
    expect(screen.getByTestId('report-body')).toBeInTheDocument();
    unmount();
    const second = renderWithQuery(<DashboardWidgetFrame widget={builtin('attention', 'component')} />);
    expect(screen.getByTestId('body')).toBeInTheDocument();
    second.unmount();
    renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template')} />);
    expect(screen.getByTestId('view')).toHaveTextContent('Net worth');
  });

  it('shows the problem under the title and no menu while editing', () => {
    renderWithQuery(<DashboardWidgetFrame widget={report()} editing issue="Pick a card for this widget." />);
    expect(screen.getByText('Pick a card for this widget.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Widget options' })).toBeNull();
  });
});

describe('DashboardWidgetFrame header', () => {
  it('has no "Open ›" link on any widget; the ⋮ menu is the way to the full page', () => {
    const { unmount } = renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template')} />);
    expect(screen.queryByRole('link', { name: /Open/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Widget options' })).toBeInTheDocument();
    unmount();
    renderWithQuery(<DashboardWidgetFrame widget={report()} />);
    expect(screen.queryByRole('link', { name: /Open/ })).toBeNull();
  });

  it('title override wins over the built-in label, which wins over the report name', () => {
    renderWithQuery(<DashboardWidgetFrame widget={report({ title: 'My spend' })} />);
    expect(screen.getByText('My spend')).toBeInTheDocument();
    expect(screen.queryByText('Spend this month')).toBeNull();
  });
});

describe('DashboardWidgetFrame menus', () => {
  const open = async () => userEvent.click(screen.getByRole('button', { name: 'Widget options' }));
  const items = () => screen.getAllByRole('menuitem').map((i) => i.textContent);

  it('a report widget: Edit report goes to the report editor', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={report()} />);
    await open();
    expect(items()).toEqual(['Edit report']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit report' }));
    expect(push).toHaveBeenCalledWith('/reports/r1');
  });

  it('a chart report widget: Edit report, View underlying data', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={report({ report: { name: 'Chart', type: 'CHART', available: true } })} />);
    await open();
    expect(items()).toEqual(['Edit report', 'View underlying data']);
  });

  it('View underlying data opens it for the report widget', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={report({ report: { name: 'Chart', type: 'CHART', available: true } })} />);
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'View underlying data' }));
    expect(screen.getByTestId('underlying')).toBeInTheDocument();
  });

  it('a template built-in whose body has no page link: Widget settings, Duplicate as my report, View full page', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template')} catalog={catalog} onSaveSettings={vi.fn()} />);
    await open();
    expect(items()).toEqual(['Widget settings', 'Duplicate as my report', 'View full page']);
  });

  it('View full page of a built-in goes to its page', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template')} />);
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'View full page' }));
    expect(push).toHaveBeenCalledWith('/upcoming');
  });

  it('Duplicate as my report saves the template with the widget params and confirms with Open', async () => {
    vi.mocked(api.POST).mockImplementation(((url: string) =>
      Promise.resolve({ data: url === '/api/v1/reports' ? { id: 'rep-9', name: 'Upcoming' } : { label: 'Upcoming', type: 'TABLE', datasource: 'obligations', definition: {}, windowAsOf: null } })) as never);
    renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template', { params: { days: 30 } })} />);
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate as my report' }));
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(vi.mocked(api.POST)).toHaveBeenNthCalledWith(1, '/api/v1/dashboards/builtins/{key}/definition', { params: { path: { key: 'upcoming' } }, body: { params: { days: 30 } } });
    expect(showToast.mock.calls[0][0]).toBe('Report "Upcoming" saved');
    showToast.mock.calls[0][1].action.onSelect();
    expect(push).toHaveBeenCalledWith('/reports/rep-9');
  });

  it('a component built-in whose body links to its page has no View full page (here, no menu at all)', async () => {
    renderWithQuery(<DashboardWidgetFrame widget={builtin('attention', 'component')} />);
    expect(screen.queryByRole('button', { name: 'Widget options' })).toBeNull();
  });

  it('Widget settings opens the settings dialog and Save hands the change on', async () => {
    const onSaveSettings = vi.fn().mockResolvedValue(undefined);
    renderWithQuery(<DashboardWidgetFrame widget={builtin('upcoming', 'template')} catalog={catalog} dashboardName="Money overview" onSaveSettings={onSaveSettings} />);
    await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Widget settings' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Changes this widget on Money overview only.')).toBeInTheDocument();
    // The closing menu leaves the page marked pointer-events none for a tick.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.type(within(dialog).getByPlaceholderText('Upcoming'), 'Next bills');
    await user.click(within(dialog).getByRole('button', { name: 'Save widget' }));
    await waitFor(() => expect(onSaveSettings).toHaveBeenCalledWith({ params: { days: 14 }, title: 'Next bills' }));
  });
});
