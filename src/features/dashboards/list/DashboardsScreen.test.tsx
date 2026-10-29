import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/dashboards', useSearchParams: () => new URLSearchParams() }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

import type { DashboardResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { DashboardsScreen } from './DashboardsScreen';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const widgets = (n: number, headers = 0) =>
  [
    ...Array.from({ length: n }, (_, i) => ({ id: `w${i}`, kind: 'report', reportId: `r${i}`, layout: { x: 0, y: i, w: 50, h: 24 } })),
    ...Array.from({ length: headers }, (_, i) => ({ id: `h${i}`, kind: 'text', layout: { x: 0, y: 99, w: 100, h: 5 } })),
  ] as unknown as DashboardResponse['widgets'];

const home: DashboardResponse = { id: 'home', name: 'Home', description: 'Your money at a glance', isDefault: true, updatedAt: '2026-10-13T08:00:00Z', createdAt: '2026-10-01T00:00:00Z', widgets: widgets(12, 2) };
const money: DashboardResponse = { id: 'money', name: 'Money overview', description: null, isDefault: false, updatedAt: '2026-10-09T08:00:00Z', createdAt: '2026-10-01T00:00:00Z', widgets: widgets(1) };

function render(dashboards: DashboardResponse[], reports: unknown[] = [{ id: 'r' }]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.dashboards.list(), dashboards);
  queryClient.setQueryData(keys.reports.list(), reports);
  // Fresh reads (a refetch after a change, the default toggle's re-read) answer with what the cache holds.
  api.GET.mockImplementation(async (url: string) => {
    if (url === '/api/v1/dashboards') return { data: dashboards };
    if (url === '/api/v1/dashboards/{id}') return { data: dashboards[0] };
    return { data: [] };
  });
  return renderWithQuery(<DashboardsScreen />, { queryClient });
}

beforeEach(() => {
  vi.clearAllMocks();
});

const menuOf = (name: string) => screen.getByRole('button', { name: `Options for ${name}` });

describe('DashboardsScreen', () => {
  it('shows the tabs without counts and no built-in widgets card', () => {
    render([home, money]);
    expect(screen.getByRole('tab', { name: /Dashboards/ })).toHaveTextContent(/^Dashboards$/);
    expect(screen.getByRole('tab', { name: /Reports/ })).toHaveTextContent(/^Reports$/);
    expect(screen.queryByText('Built-in widgets')).toBeNull();
    expect(screen.queryByText(/available · add to any board/)).toBeNull();
  });

  it('is a table with Dashboard, Widgets, Default, Updated columns, one row per dashboard', () => {
    render([home, money]);
    const table = screen.getByRole('table');
    for (const name of ['Dashboard', 'Widgets', 'Default', 'Updated']) expect(within(table).getAllByText(name).length).toBeGreaterThan(0);
    expect(within(table).getByText('Home')).toBeInTheDocument();
    expect(within(table).getByText('Money overview')).toBeInTheDocument();
  });

  it('shows the description, widget count (headers not counted), Default badge and update day', () => {
    render([home, money]);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Your money at a glance')).toBeInTheDocument();
    expect(within(table).getByText('12')).toBeInTheDocument();
    expect(within(table).getByText('13 Oct')).toBeInTheDocument();
    expect(within(table).getByText('9 Oct')).toBeInTheDocument();
    // The Default badge is on Home's row only.
    const rowOfName = (name: string) => within(table).getByText(name).closest('[role="button"]') as HTMLElement;
    expect(within(rowOfName('Home')).getByText('Default')).toBeInTheDocument();
    expect(within(rowOfName('Money overview')).queryByText('Default')).toBeNull();
  });

  it('pressing a row opens the dashboard', async () => {
    render([home, money]);
    await user.click(screen.getByText('Money overview'));
    expect(router.push).toHaveBeenCalledWith('/dashboards/money');
  });

  it('search narrows the rows by name and description, and says so when none match', async () => {
    render([home, money]);
    await user.type(screen.getByPlaceholderText('Search'), 'glance');
    expect(screen.queryByText('Money overview')).toBeNull();
    expect(screen.getByText('Home')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Search'));
    await user.type(screen.getByPlaceholderText('Search'), 'zzz');
    expect(screen.getByText('No dashboards match')).toBeInTheDocument();
    // The empty state's own action (the field has its own clear button too).
    await user.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1)!);
    expect(screen.getByText('Money overview')).toBeInTheDocument();
  });

  it('the ⋯ menu opens without navigating into the dashboard', async () => {
    render([home, money]);
    await user.click(menuOf('Money overview'));
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('menu on a non-default dashboard: Edit, Set as default, Delete dashboard', async () => {
    render([home, money]);
    await user.click(menuOf('Money overview'));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Edit', 'Set as default', 'Delete dashboard']);
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    // Only Edit navigates: the press in the menu is not also a press on the row.
    expect(router.push.mock.calls).toEqual([['/dashboards/money?edit=1']]);
  });

  it('menu on the default dashboard offers Clear default', async () => {
    render([home, money]);
    await user.click(menuOf('Home'));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Edit', 'Clear default', 'Delete dashboard']);
  });

  it('Set as default saves the dashboard as the default and says so', async () => {
    api.PUT.mockResolvedValue({ data: { ...money, isDefault: true } });
    render([money, home]);
    await user.click(menuOf('Money overview'));
    await user.click(screen.getByRole('menuitem', { name: 'Set as default' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT.mock.calls[0][1].body).toMatchObject({ name: 'Money overview', isDefault: true });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Default dashboard set'));
  });

  it('Delete asks first, in the board words, and Cancel keeps the dashboard', async () => {
    render([home, money]);
    await user.click(menuOf('Money overview'));
    await user.click(screen.getByRole('menuitem', { name: 'Delete dashboard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Money overview?' });
    expect(within(dialog).getByText("Its widgets go with it; your saved reports stay. This can't be undone.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.DELETE).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Delete dashboard removes it and confirms with a toast', async () => {
    api.DELETE.mockResolvedValue({});
    render([home, money]);
    await user.click(menuOf('Money overview'));
    await user.click(screen.getByRole('menuitem', { name: 'Delete dashboard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Money overview?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete dashboard' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/dashboards/{id}', { params: { path: { id: 'money' } } }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Dashboard deleted'));
  });

  it('a failed delete says so and keeps the dialog for another try', async () => {
    api.DELETE.mockRejectedValue(new Error('boom'));
    render([home, money]);
    await user.click(menuOf('Money overview'));
    await user.click(screen.getByRole('menuitem', { name: 'Delete dashboard' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete dashboard' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers Restore default Home only while there is no Home', () => {
    const { unmount } = render([home, money]);
    expect(screen.queryByRole('button', { name: 'Restore default Home' })).toBeNull();
    unmount();
    render([money]);
    expect(screen.getByRole('button', { name: 'Restore default Home' })).toBeInTheDocument();
  });

  it('Restore default Home restores it and confirms with a toast', async () => {
    api.POST.mockResolvedValue({ data: home });
    render([money]);
    await user.click(screen.getByRole('button', { name: 'Restore default Home' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/home/restore'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Home dashboard restored'));
  });

  it('a failed restore says so and its toast offers Retry, which tries again', async () => {
    api.POST.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ data: home });
    render([money]);
    await user.click(screen.getByRole('button', { name: 'Restore default Home' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't restore Home. Try again.", expect.objectContaining({ tone: 'danger' })));
    const options = toast.mock.calls.find((c) => c[0] === "Couldn't restore Home. Try again.")![1];
    expect(options.action.label).toBe('Retry');
    options.action.onSelect();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Home dashboard restored'));
    expect(api.POST).toHaveBeenCalledTimes(2);
  });

  it('with no dashboards: the empty state, with Add dashboard and Restore default Home', async () => {
    api.POST.mockResolvedValue({ data: home });
    render([]);
    expect(screen.getByText('No dashboards yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add dashboard' }));
    expect(router.push).toHaveBeenCalledWith('/dashboards/new');
    await user.click(screen.getByRole('button', { name: 'Restore default Home' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
  });
});
