import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/notifications/useNotificationsAction', () => ({ useNotificationsAction: () => ({ id: 'notifications', icon: 'notifications', label: 'Notifications' }) }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

// The grid of widgets and the picker have their own tests: here they are a list of titles and one button that adds Net worth.
vi.mock('../view/DashboardWidgets', () => ({
  DashboardWidgets: ({ widgets, dashboardName }: { widgets: { id: string }[]; dashboardName?: string }) => (
    <div data-testid="widgets" data-dashboard={dashboardName}>
      {widgets.map((w) => w.id).join(',')}
    </div>
  ),
}));
vi.mock('../picker/WidgetPicker', () => ({
  WidgetPicker: ({ onAddBuiltin, onClose }: { onAddBuiltin: (def: unknown, params: unknown, title: string | null) => void; onClose: () => void }) => (
    <div role="dialog" aria-label="Add widget">
      <button
        onClick={() => {
          onAddBuiltin({ key: 'net_worth', label: 'Net worth', minW: 25, kind: 'template', category: 'money', description: '', params: [] }, {}, null);
          onClose();
        }}
      >
        Add Net worth
      </button>
    </div>
  ),
}));

import type { DashboardResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { HomeScreen } from './HomeScreen';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const widget = (id: string) => ({ id, kind: 'builtin', builtinKey: 'upcoming', params: {}, title: null, reportId: null, layout: { x: 0, y: 0, w: 50, h: 24 }, builtin: { key: 'upcoming', label: 'Upcoming', minW: 50, kind: 'template', category: 'money' } });
const home: DashboardResponse = { id: 'home', name: 'Home', description: null, isDefault: true, updatedAt: '2026-10-13T08:00:00Z', createdAt: '2026-10-01T00:00:00Z', widgets: [widget('w1')] as unknown as DashboardResponse['widgets'] };
const money: DashboardResponse = { id: 'money', name: 'Money overview', description: 'Spend and portfolio', isDefault: false, updatedAt: '2026-10-09T08:00:00Z', createdAt: '2026-10-01T00:00:00Z', widgets: [widget('m1'), widget('m2')] as unknown as DashboardResponse['widgets'] };

function render(dashboards: DashboardResponse[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.dashboards.list(), dashboards);
  queryClient.setQueryData(keys.dashboards.builtins(), []);
  api.GET.mockImplementation(async (url: string) => {
    if (url === '/api/v1/dashboards') return { data: dashboards };
    return { data: [] };
  });
  return renderWithQuery(<HomeScreen />, { queryClient });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomeScreen', () => {
  it('has no greeting, status line or page title: the switcher is the top bar\'s title', () => {
    render([home, money]);
    expect(screen.queryByRole('heading', { name: /Good/ })).toBeNull();
    expect(screen.queryByText(/things? needs? you|synced/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Home' })).toBeNull();
    const bar = screen.getByRole('banner');
    expect(within(bar).getByTestId('home-switch')).toBeInTheDocument();
    expect(within(bar).queryByRole('button', { name: 'Dashboard actions' })).toBeNull();
    // Nothing above the widgets in the body.
    expect(screen.getByRole('main').firstElementChild).toBe(screen.getByTestId('widgets'));
  });

  it('the switcher takes the rest of the top bar: it grows with no fixed width, and so does its wrapper', () => {
    render([home, money]);
    const select = screen.getByTestId('home-switch');
    // The Select's own wrapper grows and may shrink; its wrapper grows too.
    const field = select.closest('div.flex-1');
    expect(field).not.toBeNull();
    expect(field?.className).toMatch(/min-w-0/);
    const row = field?.parentElement as HTMLElement;
    expect(row.className).toMatch(/flex-1/);
    expect(row.innerHTML).not.toMatch(/container-xs/);
    expect(within(row).queryByRole('button', { name: 'Dashboard actions' })).toBeNull();
  });

  it('shows the default dashboard', () => {
    render([money, home]);
    expect(screen.getByTestId('widgets')).toHaveAttribute('data-dashboard', 'Home');
    expect(screen.getByTestId('widgets')).toHaveTextContent('w1');
  });

  it('the switcher lists the dashboards and shows the one picked in place', async () => {
    render([home, money]);
    await user.click(screen.getByTestId('home-switch'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Home', 'Money overview']);
    await user.click(screen.getByRole('option', { name: 'Money overview' }));
    expect(screen.getByTestId('widgets')).toHaveAttribute('data-dashboard', 'Money overview');
    expect(screen.getByTestId('widgets')).toHaveTextContent('m1,m2');
  });

  it('the switcher ends with View all dashboards', async () => {
    render([home, money]);
    await user.click(screen.getByTestId('home-switch'));
    await user.click(screen.getByRole('button', { name: 'View all dashboards' }));
    expect(router.push).toHaveBeenCalledWith('/dashboards');
  });

  it('the switcher of the default dashboard has Add widget, Edit dashboard and New dashboard, with no Set as default', async () => {
    render([home]);
    await user.click(screen.getByTestId('home-switch'));
    expect(screen.queryByRole('button', { name: 'Set as default' })).toBeNull();
    for (const name of ['Add widget', 'Edit dashboard', 'New dashboard', 'View all dashboards']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'Edit dashboard' }));
    expect(router.push).toHaveBeenCalledWith('/dashboards/home?edit=1');
  });

  it('the switcher of a dashboard that is not the default offers Set as default, which saves it as the default', async () => {
    api.PUT.mockResolvedValue({ data: { ...money, isDefault: true } });
    render([home, money]);
    // The default toggle re-reads the dashboard before it writes.
    api.GET.mockImplementation(async (url: string) => ({ data: url === '/api/v1/dashboards/{id}' ? money : [] }));
    await user.click(screen.getByTestId('home-switch'));
    await user.click(screen.getByRole('option', { name: 'Money overview' }));
    await user.click(screen.getByTestId('home-switch'));
    expect(screen.getByRole('button', { name: 'Set as default' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set as default' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Set as default'));
    expect(api.PUT.mock.calls[0][1].body).toMatchObject({ name: 'Money overview', isDefault: true });
  });

  it('New dashboard goes to the create page', async () => {
    render([home]);
    await user.click(screen.getByTestId('home-switch'));
    await user.click(screen.getByRole('button', { name: 'New dashboard' }));
    expect(router.push).toHaveBeenCalledWith('/dashboards/new');
  });

  it('Add widget saves the pick straight to the dashboard and the toast Undo removes it again', async () => {
    api.PUT.mockImplementation(async (_url: string, { body }: { body: { widgets: { id: string }[] } }) => ({
      data: { ...home, widgets: body.widgets.map((w, i) => ({ ...widget(w.id), ...w, id: i === 0 ? 'w1' : w.id })) },
    }));
    render([home]);
    await user.click(screen.getByTestId('home-switch'));
    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Add widget' })).getByRole('button', { name: 'Add Net worth' }));

    await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1));
    const saved = api.PUT.mock.calls[0][1].body.widgets as { id: string; builtinKey?: string }[];
    expect(saved.map((w) => w.builtinKey)).toEqual(['upcoming', 'net_worth']);
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Widget added to Home', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) })));

    // Undo saves the dashboard again without the new widget.
    const { action } = toast.mock.calls.find((c) => c[0] === 'Widget added to Home')![1];
    action.onSelect();
    await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(2));
    expect((api.PUT.mock.calls[1][1].body.widgets as { id: string }[]).map((w) => w.id)).toEqual(['w1']);
  });

  it('a failed add says so and keeps what was there', async () => {
    api.PUT.mockRejectedValue(new Error('boom'));
    render([home]);
    await user.click(screen.getByTestId('home-switch'));
    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Add widget' })).getByRole('button', { name: 'Add Net worth' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
    expect(screen.getByTestId('widgets')).toHaveTextContent('w1');
  });

  it('a dashboard with no widgets says so and offers Add widget', async () => {
    render([{ ...home, widgets: [] }]);
    expect(screen.getByText('This dashboard has no widgets yet')).toBeInTheDocument();
    expect(screen.queryByTestId('widgets')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    expect(await screen.findByRole('dialog', { name: 'Add widget' })).toBeInTheDocument();
  });

  describe('with no default dashboard', () => {
    it('offers Restore default Home, Create dashboard, View dashboards and Ask the data', () => {
      render([{ ...money }]);
      expect(screen.getByText('No default dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Restore default Home' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Create dashboard' })).toHaveAttribute('href', '/dashboards/new');
      expect(screen.getByRole('link', { name: 'View dashboards' })).toHaveAttribute('href', '/dashboards');
      expect(within(screen.getByRole('main')).getByRole('link', { name: 'Ask the data' })).toHaveAttribute('href', '/chat');
    });

    it('Restore default Home restores it, says so and reloads the page', async () => {
      api.POST.mockResolvedValue({ data: home });
      render([]);
      await user.click(screen.getByRole('button', { name: 'Restore default Home' }));
      await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/home/restore'));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Home dashboard restored'));
      expect(router.refresh).toHaveBeenCalled();
    });
  });
});
