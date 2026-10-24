import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportSummaryResponse } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { reportRows } from './reportsList';
import { ReportsScreen, type ReportsScreenProps } from './ReportsScreen';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const dashboards = vi.hoisted(() => ({
  list: [] as unknown[],
  failed: false,
  refetch: vi.fn(),
  putWidgets: vi.fn(),
}));
vi.mock('@/lib/query/hooks/useDashboards', () => ({
  useDashboards: () => ({ data: dashboards.list, isLoading: false, isError: dashboards.failed, refetch: dashboards.refetch }),
  putWidgets: dashboards.putWidgets,
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
  // A row draws its menu twice (desktop cell, phone line); CSS shows one.
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

  it('has no datasource chips and no counts on the type chips', () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    expect(screen.queryByRole('button', { name: /^Transactions$/ })).toBeNull();
    for (const label of ['All', 'KPI', 'Chart', 'Table']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('opens the editor on a row tap', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.click(within(screen.getByRole('table')).getByText('Net worth over time'));
    expect(router.push).toHaveBeenCalledWith('/ds/reports/r2');
  });

  it('shows the empty state for no reports at all', () => {
    renderWithQuery(<ReportsScreen {...props({ rows: [] })} />);
    expect(screen.getByText(/No reports yet/)).toBeInTheDocument();
  });
});

describe('type chips', () => {
  it('a chip goes to its ?type= URL and All goes to the plain URL', async () => {
    renderWithQuery(<ReportsScreen {...props({ type: 'KPI' })} />);
    await user.click(screen.getByRole('button', { name: 'Chart' }));
    expect(router.push).toHaveBeenLastCalledWith(expect.stringMatching(/\/reports\?type=CHART$/), { scroll: false });
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(router.push).toHaveBeenLastCalledWith(expect.not.stringContaining('?'), { scroll: false });
  });

  it('marks the chip of the URL type as selected', () => {
    renderWithQuery(<ReportsScreen {...props({ type: 'TABLE' })} />);
    expect(screen.getByRole('button', { name: 'Table' }).className).toContain('bg-brand-tint');
    expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-brand-tint');
  });

  it('says nothing matches, and Clear filters goes back to All, when a type has no reports', async () => {
    renderWithQuery(<ReportsScreen {...props({ type: 'TABLE', rows: [] })} />);
    expect(screen.getByText('No reports match.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith(expect.not.stringContaining('?'), { scroll: false });
  });
});

describe('search and Datasource filter', () => {
  it('searches the loaded list without asking the server', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.type(screen.getByPlaceholderText('Search reports'), 'rewards');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Rewards earned by card')).toBeInTheDocument();
    expect(within(table).queryByText('Net worth over time')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('filters by datasource from the Datasource chip', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.click(screen.getByRole('button', { name: /Datasource/ }));
    await user.click(await screen.findByText('Net worth', { selector: '[role="option"] *, [role="option"]' }));
    await user.keyboard('{Escape}');
    const table = screen.getByRole('table');
    await waitFor(() => expect(within(table).queryByText('Spend this month')).toBeNull());
    expect(within(table).getByText('Net worth over time')).toBeInTheDocument();
  });

  it('Clear filters empties the search', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await user.type(screen.getByPlaceholderText('Search reports'), 'zzz');
    expect(screen.getByText('No reports match.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(within(screen.getByRole('table')).getByText('Net worth over time')).toBeInTheDocument();
  });
});

describe('row menu', () => {
  it('Edit opens the editor', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    await openMenu('Net worth over time');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(router.push).toHaveBeenCalledWith('/ds/reports/r2');
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
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete report' }));
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
      dashboards.putWidgets.mockImplementation(async (_d, widgets: unknown[]) => ({ ...money, widgets }));
      renderWithQuery(<ReportsScreen {...props({ rows: onHome })} />);
      const dialog = await openDialog();
      const add = within(dialog).getByRole('button', { name: 'Add to dashboard' });
      expect(add).toBeDisabled();
      await user.click(within(dialog).getByRole('combobox'));
      await user.click(await screen.findByText('Money overview', { selector: '[role="option"] *, [role="option"]' }));
      await user.click(add);

      await waitFor(() => expect(dashboards.putWidgets).toHaveBeenCalledTimes(1));
      expect(api.GET).toHaveBeenCalledWith('/api/v1/dashboards/{id}', { params: { path: { id: 'd2' } } });
      const [from, widgets] = dashboards.putWidgets.mock.calls[0] as [unknown, { id: string; reportId?: string }[]];
      expect(from).toBe(fresh);
      expect(widgets.map((w) => w.id)).toContain('w-new-elsewhere');
      expect(widgets.find((w) => w.reportId === 'r2')).toBeDefined();
      const options = toast.mock.calls.find((c) => c[0] === 'Added to Money overview')![1] as { action: { label: string; onSelect: () => void } };
      expect(options.action.label).toBe('Undo');

      // Undo: fresh read again, then the added widget leaves and the other stays.
      const added = widgets.find((w) => w.reportId === 'r2')!;
      api.GET.mockResolvedValue({ data: { ...money, widgets } });
      options.action.onSelect();
      await waitFor(() => expect(dashboards.putWidgets).toHaveBeenCalledTimes(2));
      const [, after] = dashboards.putWidgets.mock.calls[1] as [unknown, { id: string }[]];
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

    it('says the dashboards did not load, with Try again, instead of an empty Select', async () => {
      dashboards.failed = true;
      renderWithQuery(<ReportsScreen {...props({ rows: onHome })} />);
      const dialog = await openDialog();
      expect(within(dialog).getByText('Could not load dashboards')).toBeInTheDocument();
      expect(within(dialog).queryByRole('combobox')).toBeNull();
      expect(within(dialog).getByRole('button', { name: 'Add to dashboard' })).toBeDisabled();
      await user.click(within(dialog).getByRole('button', { name: 'Try again' }));
      expect(dashboards.refetch).toHaveBeenCalled();
    });
  });

  it('a phone row has the same menu on its own line', async () => {
    renderWithQuery(<ReportsScreen {...props()} />);
    // Desktop cell and phone line: two menus per row.
    expect(screen.getAllByRole('button', { name: 'Options for Net worth over time' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Options for Net worth over time' })[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(router.push).toHaveBeenCalledWith('/ds/reports/r2');
  });
});
