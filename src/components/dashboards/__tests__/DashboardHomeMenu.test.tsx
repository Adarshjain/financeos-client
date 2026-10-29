import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('@/components/bills/BillsDueWidget', () => ({ BillsDueWidget: () => <div data-testid="bills-widget" /> }));
vi.mock('@/components/inbox/InboxWidget', () => ({ InboxWidget: () => <div data-testid="inbox-widget" /> }));
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));
vi.mock('@/lib/useMediaQuery', () => ({ BELOW_MD_QUERY: 'q', useMediaQuery: () => false }));
vi.mock('react-grid-layout/legacy', () => ({
  __esModule: true,
  default: (props: { children: ReactNode }) => <div data-testid="rgl">{props.children}</div>,
  WidthProvider: (c: unknown) => c,
}));
vi.mock('react-grid-layout/css/styles.css', () => ({}));
vi.mock('react-resizable/css/styles.css', () => ({}));

import { DashboardHome } from '@/components/dashboards/DashboardHome';
import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse, DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const attention: WidgetResponse = {
  id: 'w-att', kind: 'builtin', reportId: null, builtinKey: 'attention', params: {}, title: null,
  layout: { x: 0, y: 0, w: 100, h: 24 },
  builtin: { key: 'attention', label: 'Inbox', minW: 100, kind: 'component', category: 'overview', templateType: null, href: null },
};
const bills: WidgetResponse = {
  id: 'w-bills', kind: 'builtin', reportId: null, builtinKey: 'bills_due', params: {}, title: null,
  layout: { x: 0, y: 24, w: 100, h: 24 },
  builtin: { key: 'bills_due', label: 'Bills due', minW: 100, kind: 'component', category: 'cards_rewards', templateType: null, href: null },
};
const netWorthDef: BuiltinWidgetResponse = {
  key: 'net_worth', label: 'Net worth', description: 'All accounts', kind: 'template', minW: 50, category: 'overview', params: [],
};
const reports = [{ id: 'r1', name: 'Spend this month', type: 'CHART' }];

const board = (over: Partial<DashboardResponse> = {}): DashboardResponse =>
  ({
    id: 'd1', name: 'Home', description: null, isDefault: true, updatedAt: '2026-10-01T00:00:00Z', widgets: [attention],
    ...over,
  }) as DashboardResponse;

/** Serve the dashboards list, a re-read of one dashboard, the reports and the built-in catalog. */
function serve(list: DashboardResponse[], current: DashboardResponse = list[0]) {
  vi.mocked(api.GET).mockImplementation(((url: string) => {
    if (url === '/api/v1/dashboards') return Promise.resolve({ data: list });
    if (url === '/api/v1/dashboards/{id}') return Promise.resolve({ data: current });
    if (url === '/api/v1/reports') return Promise.resolve({ data: reports });
    if (url === '/api/v1/dashboards/builtins') return Promise.resolve({ data: [netWorthDef] });
    return Promise.resolve({ data: [] });
  }) as never);
  vi.mocked(api.POST).mockResolvedValue({ data: null } as never);
}

type User = ReturnType<typeof userEvent.setup>;

async function openMenu(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Dashboard actions' }));
  await screen.findByRole('menuitem', { name: 'Add widget' });
}

const putBody = (call = 0) =>
  (vi.mocked(api.PUT).mock.calls[call][1] as { body: { name: string; isDefault: boolean; widgets: Array<Record<string, unknown>> } }).body;

describe('Home dashboard menu', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sits right after the switcher and offers Add widget, Edit dashboard, Set as default and New dashboard', async () => {
    const user = userEvent.setup();
    serve([board({ isDefault: false })]);
    renderWithQuery(<DashboardHome />);
    const trigger = await screen.findByRole('button', { name: 'Dashboard actions' });
    const switcher = screen.getByRole('button', { name: 'Switch dashboard, current: Home' });
    expect(switcher.parentElement?.nextElementSibling).toBe(trigger);
    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Edit dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Set as default' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'New dashboard' })).toHaveAttribute('href', '/legacy/dashboards/new');
  });

  it('hides Set as default when the shown dashboard is already the default', async () => {
    const user = userEvent.setup();
    serve([board()]);
    renderWithQuery(<DashboardHome />);
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'Set as default' })).not.toBeInTheDocument();
  });

  describe('Set as default', () => {
    it('re-reads the shown dashboard and saves it as the default, unchanged otherwise', async () => {
      const user = userEvent.setup();
      const home = board();
      const cards = board({ id: 'd2', name: 'Cards', isDefault: false, widgets: [bills] });
      serve([home, cards], cards);
      vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
      renderWithQuery(<DashboardHome />);
      await user.click(await screen.findByRole('button', { name: 'Switch dashboard, current: Home' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Cards' }));
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Set as default' }));
      await waitFor(() => expect(api.PUT).toHaveBeenCalled());
      expect(api.GET).toHaveBeenCalledWith('/api/v1/dashboards/{id}', { params: { path: { id: 'd2' } } });
      expect(vi.mocked(api.PUT).mock.calls[0][1]).toMatchObject({
        params: { path: { id: 'd2' } },
        body: { name: 'Cards', isDefault: true, widgets: [{ id: 'w-bills', builtinKey: 'bills_due' }] },
      });
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Set as default'));
    });

    it('refuses (no save) when the dashboard changed since Home loaded it', async () => {
      const user = userEvent.setup();
      const shown = board({ isDefault: false });
      serve([shown], { ...shown, updatedAt: '2026-10-02T00:00:00Z' });
      renderWithQuery(<DashboardHome />);
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Set as default' }));
      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(api.PUT).not.toHaveBeenCalled();
    });
  });

  describe('Add widget', () => {
    it('opens the picker with no button of its own and loads the reports and the built-in catalog', async () => {
      const user = userEvent.setup();
      serve([board()]);
      renderWithQuery(<DashboardHome />);
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: 'Add a widget' })).toBeInTheDocument();
      expect(await within(dialog).findByText('Spend this month')).toBeInTheDocument();
      expect(await within(dialog).findByText('Net worth')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add widget' })).not.toBeInTheDocument();
    });

    it('a picked report is saved at once below the existing widgets, and the picker closes', async () => {
      const user = userEvent.setup();
      serve([board()]);
      vi.mocked(api.PUT).mockResolvedValue({ data: board() } as never);
      renderWithQuery(<DashboardHome />);
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
      await user.click(await screen.findByText('Spend this month'));
      await waitFor(() => expect(api.PUT).toHaveBeenCalled());
      const body = putBody();
      expect(body).toMatchObject({ name: 'Home', isDefault: true });
      expect(body.widgets).toHaveLength(2);
      expect(body.widgets[0]).toMatchObject({ id: 'w-att', builtinKey: 'attention' });
      expect(body.widgets[1]).toMatchObject({ kind: 'report', reportId: 'r1', layout: { x: 0, y: 24 } });
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Widget added to Home'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('a picked built-in is saved with the params from its details step', async () => {
      const user = userEvent.setup();
      serve([board()]);
      vi.mocked(api.PUT).mockResolvedValue({ data: board() } as never);
      renderWithQuery(<DashboardHome />);
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
      await user.click(await screen.findByText('Net worth'));
      await user.click(await screen.findByRole('button', { name: 'Add widget' }));
      await waitFor(() => expect(api.PUT).toHaveBeenCalled());
      expect(putBody().widgets[1]).toMatchObject({ kind: 'builtin', builtinKey: 'net_worth', params: {}, layout: { y: 24 } });
    });

    it('Home then shows the saved dashboard', async () => {
      const user = userEvent.setup();
      serve([board()]);
      vi.mocked(api.PUT).mockResolvedValue({ data: board({ widgets: [attention, bills] }) } as never);
      renderWithQuery(<DashboardHome />);
      expect(await screen.findByTestId('inbox-widget')).toBeInTheDocument();
      expect(screen.queryByTestId('bills-widget')).not.toBeInTheDocument();
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
      await user.click(await screen.findByText('Spend this month'));
      expect(await screen.findByTestId('bills-widget')).toBeInTheDocument();
    });

    it('a failed save reports the error and leaves the dashboard as shown', async () => {
      const user = userEvent.setup();
      serve([board()]);
      vi.mocked(api.PUT).mockRejectedValue(new Error('boom'));
      renderWithQuery(<DashboardHome />);
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
      await user.click(await screen.findByText('Spend this month'));
      await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to add widget'));
      expect(toast.success).not.toHaveBeenCalled();
      expect(screen.getAllByTestId('inbox-widget')).toHaveLength(1);
    });

    it('the menu button is disabled while the add saves', async () => {
      const user = userEvent.setup();
      serve([board()]);
      vi.mocked(api.PUT).mockReturnValue(new Promise(() => {}) as never);
      renderWithQuery(<DashboardHome />);
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
      await user.click(await screen.findByText('Spend this month'));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Dashboard actions' })).toBeDisabled());
    });
  });

  describe('Edit dashboard (in place)', () => {
    const backButton = () => document.querySelector('svg.lucide-arrow-left')!.closest('button')!;

    async function startEditing(user: User) {
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Edit dashboard' }));
      return screen.findByPlaceholderText('Dashboard name');
    }

    it('turns Home into the editor for the dashboard being shown, without leaving Home', async () => {
      const user = userEvent.setup();
      serve([board(), board({ id: 'd2', name: 'Cards', isDefault: false, widgets: [bills] })]);
      renderWithQuery(<DashboardHome />);
      await user.click(await screen.findByRole('button', { name: 'Switch dashboard, current: Home' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Cards' }));
      const name = await startEditing(user);
      expect(name).toHaveValue('Cards');
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add widget' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Switch dashboard/ })).not.toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('back with no changes returns to the Home view without saving', async () => {
      const user = userEvent.setup();
      serve([board()]);
      renderWithQuery(<DashboardHome />);
      await startEditing(user);
      await user.click(backButton());
      expect(await screen.findByRole('button', { name: 'Switch dashboard, current: Home' })).toBeInTheDocument();
      expect(api.PUT).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('back with unsaved changes confirms, then discards them and returns to the view', async () => {
      const user = userEvent.setup();
      serve([board()]);
      renderWithQuery(<DashboardHome />);
      const name = await startEditing(user);
      await user.clear(name);
      await user.type(name, 'Renamed');
      await user.click(backButton());
      await user.click(await screen.findByRole('button', { name: 'Discard' }));
      expect(await screen.findByRole('button', { name: 'Switch dashboard, current: Home' })).toBeInTheDocument();
      expect(api.PUT).not.toHaveBeenCalled();
    });

    it('Save stores the dashboard and returns to the view showing the saved version', async () => {
      const user = userEvent.setup();
      serve([board()]);
      const saved = board({ name: 'Renamed', widgets: [attention, bills] });
      // The server has the saved version from here on (the list refetches after a save).
      vi.mocked(api.PUT).mockImplementation((async () => {
        serve([saved]);
        return { data: saved };
      }) as never);
      renderWithQuery(<DashboardHome />);
      const name = await startEditing(user);
      await user.clear(name);
      await user.type(name, 'Renamed');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(api.PUT).toHaveBeenCalled());
      expect(putBody()).toMatchObject({ name: 'Renamed', isDefault: true });
      expect(await screen.findByRole('button', { name: 'Switch dashboard, current: Renamed' })).toBeInTheDocument();
      expect(screen.getByTestId('bills-widget')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('a failed save stays in the editor with the changes', async () => {
      const user = userEvent.setup();
      serve([board()]);
      vi.mocked(api.PUT).mockRejectedValue(new Error('boom'));
      renderWithQuery(<DashboardHome />);
      const name = await startEditing(user);
      await user.clear(name);
      await user.type(name, 'Renamed');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(screen.getByPlaceholderText('Dashboard name')).toHaveValue('Renamed');
    });
  });
});
