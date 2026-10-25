import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/ds/dashboard', useSearchParams: () => new URLSearchParams() }));
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

// 12:30 in IST on Tuesday 13 Oct 2026.
const NOW = '2026-10-13T07:00:00Z';

const widget = (id: string) => ({ id, kind: 'builtin', builtinKey: 'upcoming', params: {}, title: null, reportId: null, layout: { x: 0, y: 0, w: 50, h: 24 }, builtin: { key: 'upcoming', label: 'Upcoming', minW: 50, kind: 'template', category: 'money' } });
const home: DashboardResponse = { id: 'home', name: 'Home', description: null, isDefault: true, updatedAt: '2026-10-13T08:00:00Z', createdAt: '2026-10-01T00:00:00Z', widgets: [widget('w1')] as unknown as DashboardResponse['widgets'] };
const money: DashboardResponse = { id: 'money', name: 'Money overview', description: 'Spend and portfolio', isDefault: false, updatedAt: '2026-10-09T08:00:00Z', createdAt: '2026-10-01T00:00:00Z', widgets: [widget('m1'), widget('m2')] as unknown as DashboardResponse['widgets'] };

function render(dashboards: DashboardResponse[], props: Partial<React.ComponentProps<typeof HomeScreen>> = {}, badge: number | null = 2) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.dashboards.list(), dashboards);
  queryClient.setQueryData(keys.dashboards.builtins(), []);
  if (badge !== null) queryClient.setQueryData(keys.inbox.summary(), { actNow: 1, needsLook: 1, info: 0, badge });
  api.GET.mockImplementation(async (url: string) => {
    if (url === '/api/v1/dashboards') return { data: dashboards };
    if (url === '/api/v1/inbox/summary') return { data: { actNow: 1, needsLook: 1, info: 0, badge: badge ?? 0 } };
    return { data: [] };
  });
  return renderWithQuery(<HomeScreen displayName="Arjun Mehta" lastSyncedAt="2026-10-13T06:56:00Z" nowIso={NOW} {...props} />, { queryClient });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomeScreen', () => {
  it('greets by first name for the hour in IST, and says what needs you and when it last synced', () => {
    render([home, money]);
    expect(screen.getByRole('heading', { name: 'Good afternoon, Arjun' })).toBeInTheDocument();
    expect(screen.getByText('Tuesday 13 Oct · 2 things need you · synced 4 min ago')).toBeInTheDocument();
  });

  it('the first render says what needs you from the server count when the cache has none yet (same as the server markup)', () => {
    render([home], { needsYou: 3 }, null);
    expect(screen.getByText('Tuesday 13 Oct · 3 things need you · synced 4 min ago')).toBeInTheDocument();
  });

  it('leaves out the parts that have no data', () => {
    render([home], { displayName: null, lastSyncedAt: undefined }, null);
    expect(screen.getByRole('heading', { name: 'Good afternoon' })).toBeInTheDocument();
    expect(screen.getByText('Tuesday 13 Oct')).toBeInTheDocument();
  });

  it('shows the default dashboard under the greeting', () => {
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
    expect(router.push).toHaveBeenCalledWith('/ds/dashboards');
  });

  it('the ⋯ menu has Add widget, Edit dashboard and New dashboard', async () => {
    render([home]);
    await user.click(screen.getByRole('button', { name: 'Dashboard actions' }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Add widget', 'Edit dashboard', 'New dashboard']);
    await user.click(screen.getByRole('menuitem', { name: 'Edit dashboard' }));
    expect(router.push).toHaveBeenCalledWith('/ds/dashboards/home?edit=1');
  });

  it('New dashboard goes to the create page', async () => {
    render([home]);
    await user.click(screen.getByRole('button', { name: 'Dashboard actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'New dashboard' }));
    expect(router.push).toHaveBeenCalledWith('/ds/dashboards/new');
  });

  it('Add widget saves the pick straight to the dashboard and the toast Undo removes it again', async () => {
    api.PUT.mockImplementation(async (_url: string, { body }: { body: { widgets: { id: string }[] } }) => ({
      data: { ...home, widgets: body.widgets.map((w, i) => ({ ...widget(w.id), ...w, id: i === 0 ? 'w1' : w.id })) },
    }));
    render([home]);
    await user.click(screen.getByRole('button', { name: 'Dashboard actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
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
    await user.click(screen.getByRole('button', { name: 'Dashboard actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
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
      expect(screen.getByRole('link', { name: 'Create dashboard' })).toHaveAttribute('href', '/ds/dashboards/new');
      expect(screen.getByRole('link', { name: 'View dashboards' })).toHaveAttribute('href', '/ds/dashboards');
      expect(within(screen.getByRole('main')).getByRole('link', { name: 'Ask the data' })).toHaveAttribute('href', '/chat');
      expect(screen.queryByRole('heading', { name: /Good/ })).toBeNull();
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
