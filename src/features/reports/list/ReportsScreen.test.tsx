import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportSummaryResponse } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ASK_HREF, reportRows } from './reportsListModel';
import { ReportsScreen, type ReportsScreenProps } from './ReportsScreen';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ unstable_rethrow: (e: unknown) => { throw e; }, useRouter: () => router, useSearchParams: () => search.params }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const dashboards = vi.hoisted(() => ({
  list: [] as unknown[],
  failed: false,
  refetch: vi.fn(),
}));
vi.mock('@/lib/query/hooks/useDashboards', () => ({
  useDashboards: () => ({ data: dashboards.list, isLoading: false, isError: dashboards.failed, refetch: dashboards.refetch }),
  storeSavedDashboard: vi.fn(),
}));

const report = (over: Partial<ReportSummaryResponse>): ReportSummaryResponse => ({
  id: 'r1',
  name: 'Spend this month',
  description: null,
  type: 'KPI',
  datasource: 'transactions',
  createdAt: '2026-10-01T05:00:00Z',
  updatedAt: '2026-10-20T05:00:00Z',
  dashboards: [],
  ...over,
});

const labels = { transactions: 'Transactions', net_worth: 'Net worth', reward_earnings: 'Reward earnings' };

const rowsFor = (reports: ReportSummaryResponse[]) => reportRows(reports, labels);

const spend = report({ id: 'r1', description: 'Everything out this month', dashboards: [{ id: 'd1', name: 'Home' }] });
const worth = report({ id: 'r2', name: 'Net worth over time', type: 'KPI', datasource: 'net_worth' });
const rewards = report({ id: 'r3', name: 'Rewards earned by card', type: 'CHART', datasource: 'reward_earnings' });

const props = (over: Partial<ReportsScreenProps> = {}): ReportsScreenProps => ({
  rows: rowsFor([rewards, worth, spend]),
  ...over,
});

const user = userEvent.setup({ pointerEventsCheck: 0 });

async function openMenu(name: string) {
  await user.click(screen.getAllByRole('button', { name: `Options for ${name}` })[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  dashboards.list = [];
  dashboards.failed = false;
});

describe('ReportsScreen list', () => {
  it('groups reports under their area, in order, with each report once and its description as a caption', () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    const table = screen.getByRole('table');
    const text = table.textContent ?? '';
    expect(text.indexOf('Spending')).toBeLessThan(text.indexOf('Wealth'));
    expect(text.indexOf('Wealth')).toBeLessThan(text.indexOf('Cards & loans'));
    expect(within(table).getAllByText('Spend this month')).toHaveLength(1);
    expect(within(table).getByText('Everything out this month')).toBeInTheDocument();
    expect(within(table).getByText('Home')).toBeInTheDocument();
  });

  it('has one Type dropdown chip and no Datasource filter', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    expect(screen.queryByRole('button', { name: /Datasource/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Type' }));
    for (const label of ['All types', 'KPI', 'Chart', 'Breakdown', 'Table']) {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('opens the editor on a row tap', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.click(within(screen.getByRole('table')).getByText('Net worth over time'));
    expect(router.push).toHaveBeenCalledWith('/reports/r2');
  });

  it('shows the empty state for no reports at all', () => {
    renderWithQuery(<ReportsScreen {...props({ rows: [] })} />);
    expect(screen.getByText(/No reports yet/)).toBeInTheDocument();
  });
});

const kpi2 = report({ id: 'r4', name: 'Spend last month' });
const breakdown = report({ id: 'r5', name: 'Where the money went', type: 'CHART', chartType: 'breakdown' });
const tableR = report({ id: 'r6', name: 'Recent transactions', type: 'TABLE' });
const mixed = rowsFor([spend, worth, kpi2, rewards, breakdown, tableR]);

describe('chip labels', () => {
  it('offers each type (Breakdown apart from Chart) with no count', async () => {
    renderWithQuery(<ReportsScreen {...props({ rows: mixed })} />);
    await user.click(screen.getByRole('button', { name: 'Type' }));
    for (const name of ['KPI', 'Chart', 'Breakdown', 'Table']) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('lists only the chosen type, with no counts on the chips or the tabs', () => {
    renderWithQuery(<ReportsScreen {...props({ rows: mixed, type: 'KPI' })} />);
    expect(screen.getByRole('button', { name: 'KPI' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Reports$/ })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Spend last month')).toBeInTheDocument();
    expect(within(table).queryByText('Recent transactions')).toBeNull();
    expect(within(table).queryByText('Where the money went')).toBeNull();
  });

  it('lists only breakdowns on the Breakdown chip', () => {
    renderWithQuery(<ReportsScreen {...props({ rows: mixed, type: 'BREAKDOWN' })} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Where the money went')).toBeInTheDocument();
    expect(within(table).queryByText('Rewards earned by card')).toBeNull();
  });

  it('links the two tabs, with Reports active', () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    expect(screen.getByRole('tab', { name: /^Dashboards$/ })).toHaveAttribute('href', '/dashboards');
    const reports = screen.getByRole('tab', { name: /^Reports$/ });
    expect(reports).toHaveAttribute('href', '/reports');
    expect(reports).toHaveAttribute('data-state', 'active');
  });
});

describe('toolbar', () => {
  it('has search and the type chips in one row, and Ask the data only in the Ask instead card', () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    const search = screen.getByPlaceholderText('Search');
    expect(search.closest('div[class*="overflow-x-auto"]')).toBe(screen.getByRole('button', { name: 'Type' }).closest('div[class*="overflow-x-auto"]'));
    const asks = screen.getAllByRole('link', { name: 'Ask the data' });
    expect(asks).toHaveLength(1);
    expect(asks[0]).toHaveAttribute('href', ASK_HREF);
    expect(ASK_HREF).toBe('/chat?q=dining%20spend%20per%20month%20on%20Regalia%2C%20this%20year');
    const card = asks[0].closest('div[class*="rounded"]') as HTMLElement;
    expect(within(card).getByText('Ask instead')).toBeInTheDocument();
    expect(within(card).getByText('Chat turns a question into a saved report')).toBeInTheDocument();
    expect(within(card).getByText(/dining spend per month on Regalia/)).toBeInTheDocument();
  });
});

describe('type chips', () => {
  it('the Type chip filters in place and sets its ?type= URL without a server round trip; its × clears it', async () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    renderWithQuery(<ReportsScreen {...props({ type: 'KPI' })} />);
    await user.click(screen.getByRole('button', { name: /^KPI/ }));
    await user.click(screen.getByRole('option', { name: 'Chart' }));
    expect(replace).toHaveBeenLastCalledWith(null, '', '/reports?type=CHART');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Rewards earned by card')).toBeInTheDocument();
    expect(within(table).queryByText('Net worth over time')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(replace).toHaveBeenLastCalledWith(null, '', '/reports');
    expect(within(screen.getByRole('table')).getByText('Net worth over time')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    replace.mockRestore();
  });

  it('follows the URL when it changes after load (back/forward)', () => {
    const { rerender } = renderWithQuery(<ReportsScreen {...props()} />);
    expect(screen.getByRole('button', { name: 'Type' })).toBeInTheDocument();
    search.params = new URLSearchParams('type=TABLE');
    rerender(<ReportsScreen {...props()} />);
    expect(screen.getByRole('button', { name: 'Reset filter' })).toBeInTheDocument();
    search.params = new URLSearchParams();
  });

  it('shows the chip of the URL type as changed, with its value only', () => {
    renderWithQuery(<ReportsScreen {...props({ type: 'TABLE' })} />);
    expect(screen.getByRole('button', { name: 'Reset filter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Type' })).toBeNull();
  });

  it('says nothing matches, and Clear filters goes back to All, when a type has no reports', async () => {
    renderWithQuery(<ReportsScreen {...props({ type: 'TABLE', rows: [] })} />);
    expect(screen.getByText('No reports match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('button', { name: 'Type' })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('search', () => {
  it('searches the loaded list without asking the server', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.type(screen.getByPlaceholderText('Search'), 'rewards');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Rewards earned by card')).toBeInTheDocument();
    expect(within(table).queryByText('Net worth over time')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Clear filters empties the search', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.type(screen.getByPlaceholderText('Search'), 'zzz');
    expect(screen.getByText('No reports match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(within(screen.getByRole('table')).getByText('Net worth over time')).toBeInTheDocument();
  });
});

describe('row menu', () => {
  it('Edit opens the editor', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await openMenu('Net worth over time');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(router.push).toHaveBeenCalledWith('/reports/r2');
  });

  it('Duplicate copies the report, toasts with Undo, and Undo deletes the copy', async () => {
    api.GET.mockResolvedValue({ data: { ...worth, definition: { a: 1 } } });
    api.POST.mockResolvedValue({ data: { id: 'copy1', name: 'Net worth over time (copy)' } });
    api.DELETE.mockResolvedValue({});
    renderWithQuery(<ReportsScreen {...props()} />);
    await openMenu('Net worth over time');
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('Report duplicated', expect.anything()));
    expect(api.POST).toHaveBeenCalledWith(
      '/api/v1/reports',
      expect.objectContaining({ body: expect.objectContaining({ name: 'Net worth over time (copy)', datasource: 'net_worth' }) }),
    );
    expect(router.refresh).toHaveBeenCalled();

    const options = toast.mock.calls.find((c) => c[0] === 'Report duplicated')![1] as { action: { label: string; onSelect: () => void } };
    expect(options.action.label).toBe('Undo');
    options.action.onSelect();
    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'copy1' } } }),
    );
  });

  it('Delete asks first, says what goes and what stays, and Cancel deletes nothing', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await openMenu('Net worth over time');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Dashboards that use it will show the report as unavailable/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.DELETE).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('confirming Delete removes the report and refreshes the list', async () => {
    api.DELETE.mockResolvedValue({});
    renderWithQuery(<ReportsScreen {...props()} />);
    await openMenu('Net worth over time');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'r2' } } }),
    );
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Report deleted'));
    expect(router.refresh).toHaveBeenCalled();
  });

  describe('Add to dashboard', () => {
    const home = { id: 'd1', name: 'Home', description: null, isDefault: true, widgets: [] as unknown[] };
    const money = { ...home, id: 'd2', name: 'Money overview', isDefault: false };
    // The report is already on Home (d1).
    const onHome = rowsFor([report({ id: 'r2', name: 'Net worth over time', datasource: 'net_worth', dashboards: [{ id: 'd1', name: 'Home' }] })]);

    async function openDialog() {
      await openMenu('Net worth over time');
      await user.click(await screen.findByRole('menuitem', { name: 'Add to dashboard' }));
      return screen.findByRole('dialog');
    }

    it('re-reads the dashboard, saves from it (never from the list), and toasts with Undo', async () => {
      dashboards.list = [home, money];
      // The list is stale: the fresh dashboard has a widget the list does not know.
      const fresh = { ...money, widgets: [{ id: 'w-new-elsewhere', layout: { x: 0, y: 0, w: 50, h: 24 } }] };
      api.GET.mockResolvedValue({ data: fresh });
      api.PUT.mockImplementation(async (_path: string, { body }: { body: { widgets: unknown[] } }) => ({ data: { ...money, widgets: body.widgets } }));
      renderWithQuery(<ReportsScreen {...props({ rows: onHome })} />);
      const dialog = await openDialog();
      const add = within(dialog).getByRole('button', { name: 'Add to dashboard' });
      expect(add).toBeDisabled();
      await user.click(within(dialog).getByRole('combobox'));
      await user.click(await screen.findByText('Money overview', { selector: '[role="option"] *, [role="option"]' }));
      await user.click(add);

      await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1));
      expect(api.GET).toHaveBeenCalledWith('/api/v1/dashboards/{id}', { params: { path: { id: 'd2' } } });
      const first = api.PUT.mock.calls[0] as [string, { params: { path: { id: string } }; body: { widgets: { id: string; reportId?: string }[] } }];
      expect(first[1].params.path.id).toBe('d2');
      const widgets = first[1].body.widgets;
      expect(widgets.map((w) => w.id)).toContain('w-new-elsewhere');
      expect(widgets.find((w) => w.reportId === 'r2')).toBeDefined();
      const options = toast.mock.calls.find((c) => c[0] === 'Added to Money overview')![1] as { action: { label: string; onSelect: () => void } };
      expect(options.action.label).toBe('Undo');

      // Undo: fresh read again, then the added widget leaves and the other stays.
      const added = widgets.find((w) => w.reportId === 'r2')!;
      api.GET.mockResolvedValue({ data: { ...money, widgets } });
      options.action.onSelect();
      await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(2));
      const after = (api.PUT.mock.calls[1] as [string, { body: { widgets: { id: string }[] } }])[1].body.widgets;
      expect(after.map((w) => w.id)).toEqual(['w-new-elsewhere']);
      expect(after.find((w) => w.id === added.id)).toBeUndefined();
    });

    it('disables the dashboards that already show the report', async () => {
      dashboards.list = [home, money];
      renderWithQuery(<ReportsScreen {...props({ rows: onHome })} />);
      const dialog = await openDialog();
      await user.click(within(dialog).getByRole('combobox'));
      const homeOption = (await screen.findAllByText('Home')).map((el) => el.closest('[role="option"]')).find(Boolean)!;
      expect(homeOption).toHaveAttribute('aria-disabled', 'true');
      const moneyOption = screen.getByText('Money overview').closest('[role="option"]')!;
      expect(moneyOption).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('says the dashboards did not load, with Retry, instead of an empty Select', async () => {
      dashboards.failed = true;
      renderWithQuery(<ReportsScreen {...props({ rows: onHome })} />);
      const dialog = await openDialog();
      expect(within(dialog).getByText("Couldn't load dashboards")).toBeInTheDocument();
      expect(within(dialog).queryByRole('combobox')).toBeNull();
      expect(within(dialog).getByRole('button', { name: 'Add to dashboard' })).toBeDisabled();
      await user.click(within(dialog).getByRole('button', { name: 'Retry' }));
      expect(dashboards.refetch).toHaveBeenCalled();
    });
  });

  it('a row has one menu, at its trailing edge on desktop and phone, and a press on it does not open the row', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    expect(screen.getAllByRole('button', { name: 'Options for Net worth over time' })).toHaveLength(1);
    await openMenu('Net worth over time');
    expect(router.push).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/reports/r2');
  });

  it('a phone row reads name, then type, datasource, dashboards and updated on one line', () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    expect(within(screen.getByRole('table')).getByText(/^KPI · Transactions · on Home · updated /)).toBeInTheDocument();
  });
});
