import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/bills/BillsDueWidget', () => ({
  BillsDueWidget: ({ accountId }: { accountId?: string | null }) => (
    <div data-testid="bills-widget" data-account={accountId ?? 'none'} />
  ),
}));
vi.mock('@/components/inbox/InboxWidget', () => ({ InboxWidget: () => <div data-testid="inbox-widget" /> }));
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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
import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { useDashboardEditor } from '@/components/dashboards/editor/useDashboardEditor';
import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse, DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { useSaveWidgetParams } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

const L = { x: 0, y: 0, w: 100, h: 24 };
const billsDef: BuiltinWidgetResponse = {
  key: 'bills_due', label: 'Bills due', description: 'Card bills', kind: 'component', minW: 100, category: 'cards_rewards',
  params: [{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: false }],
};
const upcomingDef: BuiltinWidgetResponse = {
  key: 'upcoming', label: 'Upcoming', description: 'Ahead', kind: 'template', minW: 100, category: 'overview',
  templateType: 'TABLE', params: [{ name: 'days', type: 'int', required: false, min: 1, max: 90, defaultValue: 14 }],
};
const attentionDef: BuiltinWidgetResponse = {
  key: 'attention', label: 'Inbox', description: 'Now', kind: 'component', minW: 100, category: 'overview', params: [],
};
const accounts = [
  { id: 'c1', name: 'HDFC Card', type: 'credit_card', closedOn: null },
  { id: 'c2', name: 'SBI Card', type: 'credit_card', closedOn: null },
];

const bills = (params: Record<string, unknown> = { accountId: 'c1' }): WidgetResponse => ({
  id: 'w-bills', kind: 'builtin', reportId: null, builtinKey: 'bills_due', params, title: null, layout: L,
  builtin: { key: 'bills_due', label: 'Bills due', minW: 100, kind: 'component', category: 'cards_rewards', templateType: null, href: null },
});
const upcoming = (days = 14): WidgetResponse => ({
  id: 'w-up', kind: 'builtin', reportId: null, builtinKey: 'upcoming', params: { days }, title: null, layout: { ...L, y: 30 },
  builtin: { key: 'upcoming', label: 'Upcoming', minW: 100, kind: 'template', category: 'overview', templateType: 'TABLE', href: '/upcoming' },
});
const attention: WidgetResponse = {
  id: 'w-inbox', kind: 'builtin', reportId: null, builtinKey: 'attention', params: {}, title: null, layout: L,
  builtin: { key: 'attention', label: 'Inbox', minW: 100, kind: 'component', category: 'overview', templateType: null, href: '/inbox' },
};
const reportWidget: WidgetResponse = {
  id: 'w-r', kind: 'report', reportId: 'r1', title: null, layout: L, report: { name: 'Spend', type: 'KPI', available: true },
};
const table = {
  type: 'TABLE', mode: 'raw', columns: [{ key: 'title', label: 'Title', type: 'string' }],
  rows: [{ id: 1, title: 'Card bill' }], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
};
const dashboard = (widgets: WidgetResponse[]): DashboardResponse => ({
  id: 'd1', name: 'Home', description: 'Mine', isDefault: true, widgets, createdAt: '', updatedAt: '',
} as DashboardResponse);

function seed() {
  vi.mocked(api.GET).mockImplementation(((url: string) => {
    if (url === '/api/v1/dashboards/builtins') return Promise.resolve({ data: [billsDef, upcomingDef, attentionDef] });
    if (url === '/api/v1/accounts') return Promise.resolve({ data: accounts });
    return Promise.resolve({ data: [] });
  }) as never);
  vi.mocked(api.POST).mockResolvedValue({ data: table } as never);
}

function wrapperFor(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const catalogCalls = () => (vi.mocked(api.GET).mock.calls as unknown[][]).filter(([u]) => u === '/api/v1/dashboards/builtins').length;

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /more actions/i }));
  await screen.findByRole('menuitem', { name: /view full page/i });
}

describe('Widget settings menu item', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seed();
  });

  it('is there on the first menu open: the catalog is fetched with the dashboard, once for all its built-ins', async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <>
        <DashboardWidgetView widget={bills()} onParamsChange={vi.fn()} />
        <DashboardWidgetView widget={upcoming()} onParamsChange={vi.fn()} />
      </>,
    );
    await waitFor(() => expect(catalogCalls()).toBe(1));
    await user.click(screen.getAllByRole('button', { name: /more actions/i })[0]);
    // No wait for a catalog request after opening: the item is in the first render of the menu.
    expect(screen.getByRole('menuitem', { name: 'Widget settings' })).toBeInTheDocument();
    expect(catalogCalls()).toBe(1);
  });

  it('is absent without a save handler, for a built-in without params, and for a report widget', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithQuery(<DashboardWidgetView widget={bills()} />);
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'Widget settings' })).not.toBeInTheDocument();
    expect(catalogCalls()).toBe(0);
    unmount();

    const second = renderWithQuery(<DashboardWidgetView widget={attention} onParamsChange={vi.fn()} />);
    await openMenu(user);
    await waitFor(() => expect(catalogCalls()).toBe(1));
    expect(screen.queryByRole('menuitem', { name: 'Widget settings' })).not.toBeInTheDocument();
    second.unmount();

    vi.mocked(api.POST).mockResolvedValue({ data: { type: 'KPI', value: 1, meta: { rowCount: 1 } } } as never);
    renderWithQuery(<DashboardWidgetView widget={reportWidget} onParamsChange={vi.fn()} />);
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'Widget settings' })).not.toBeInTheDocument();
    expect(catalogCalls()).toBe(1);
  });

  it('a template built-in offers both Widget settings and Duplicate', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={upcoming()} onParamsChange={vi.fn()} />);
    await openMenu(user);
    expect(await screen.findByRole('menuitem', { name: 'Widget settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /duplicate as my report/i })).toBeInTheDocument();
  });

  it('opens the params form prefilled from the widget; Save hands over the new params and closes', async () => {
    const user = userEvent.setup();
    const onParamsChange = vi.fn().mockResolvedValue(undefined);
    renderWithQuery(<DashboardWidgetView widget={bills()} onParamsChange={onParamsChange} />);
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Widget settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Widget settings' });
    expect(within(dialog).getByTestId('select')).toHaveAttribute('data-value', 'c1');
    await user.click(await within(dialog).findByRole('option', { name: 'SBI Card' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onParamsChange).toHaveBeenCalledWith({ accountId: 'c2' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Widget settings' })).not.toBeInTheDocument());
  });

  it('an invalid value disables Save', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={upcoming()} onParamsChange={vi.fn()} />);
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Widget settings' }));
    const input = await screen.findByLabelText('Days ahead');
    expect(input).toHaveValue(14);
    await user.clear(input);
    await user.type(input, '200');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('a failed save reports the error and keeps the dialog open; Cancel closes without saving', async () => {
    const user = userEvent.setup();
    const onParamsChange = vi.fn().mockRejectedValue(new Error('boom'));
    renderWithQuery(<DashboardWidgetView widget={upcoming()} onParamsChange={onParamsChange} />);
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Widget settings' }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to save widget settings'));
    expect(screen.getByRole('dialog', { name: 'Widget settings' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Widget settings' })).not.toBeInTheDocument());
    expect(onParamsChange).toHaveBeenCalledTimes(1);
  });

  it('while saving, Save is disabled with a spinner and a second press sends nothing more', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onParamsChange = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    renderWithQuery(<DashboardWidgetView widget={upcoming()} onParamsChange={onParamsChange} />);
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Widget settings' }));
    const save = await screen.findByRole('button', { name: 'Save' });
    await user.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save.querySelector('svg.animate-spin')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.click(save);
    expect(onParamsChange).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Widget settings' })).not.toBeInTheDocument());
    expect(onParamsChange).toHaveBeenCalledTimes(1);
  });

  it('a stored card that is no longer offered shows as "No longer available"; Save keeps working and All resets it', async () => {
    const user = userEvent.setup();
    const onParamsChange = vi.fn().mockResolvedValue(undefined);
    renderWithQuery(<DashboardWidgetView widget={bills({ accountId: 'gone' })} onParamsChange={onParamsChange} />);
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Widget settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Widget settings' });
    expect(await within(dialog).findByRole('option', { name: 'No longer available' })).toBeInTheDocument();
    expect(within(dialog).getByText(/This card is no longer available/)).toBeInTheDocument();
    // Optional param: not blocking, and one tap goes back to All cards.
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Use All cards' }));
    expect(within(dialog).getByTestId('select')).toHaveAttribute('data-value', '__all__');
    expect(within(dialog).queryByRole('option', { name: 'No longer available' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onParamsChange).toHaveBeenCalledWith({});
  });
});

describe('useSaveWidgetParams', () => {
  beforeEach(() => vi.resetAllMocks());

  it('PUTs the dashboard with only that widget`s params replaced and updates the caches', async () => {
    const qc = createTestQueryClient();
    // Keep the seeded list (no observers here) for the whole test.
    qc.setDefaultOptions({ queries: { gcTime: Infinity } });
    const before = dashboard([bills(), upcoming(14)]);
    const saved = dashboard([bills(), upcoming(30)]);
    qc.setQueryData(keys.dashboards.list(), [before, { ...before, id: 'd2' }]);
    vi.mocked(api.PUT).mockResolvedValue({ data: saved } as never);
    const wrapper = wrapperFor(qc);
    const { result } = renderHook(() => useSaveWidgetParams(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ dashboard: before, widgetId: 'w-up', params: { days: 30 } });
    });
    const body = vi.mocked(api.PUT).mock.calls[0][1] as { params: unknown; body: { name: string; description?: string; isDefault: boolean; widgets: Array<{ id: string; params: unknown }> } };
    expect(body.params).toEqual({ path: { id: 'd1' } });
    expect(body.body.name).toBe('Home');
    expect(body.body.description).toBe('Mine');
    expect(body.body.isDefault).toBe(true);
    expect(body.body.widgets.map((w) => [w.id, w.params])).toEqual([['w-bills', { accountId: 'c1' }], ['w-up', { days: 30 }]]);
    expect(qc.getQueryData(keys.dashboards.byId('d1'))).toEqual(saved);
    const list = qc.getQueryData(keys.dashboards.list()) as DashboardResponse[];
    expect(list[0]).toEqual(saved);
    expect(list[1]).toEqual({ ...before, id: 'd2' });
  });
});

describe('saving from the dashboards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seed();
  });

  it('home: saves through the active dashboard and the widget refetches with the new params', async () => {
    const user = userEvent.setup();
    const before = dashboard([upcoming(14)]);
    const saved = dashboard([upcoming(30)]);
    vi.mocked(api.GET).mockImplementation(((url: string) => {
      if (url === '/api/v1/dashboards') return Promise.resolve({ data: [before] });
      if (url === '/api/v1/dashboards/builtins') return Promise.resolve({ data: [upcomingDef] });
      return Promise.resolve({ data: [] });
    }) as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: saved } as never);
    renderWithQuery(<DashboardHome />);
    expect(await screen.findByText('Card bill')).toBeInTheDocument();
    await openMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Widget settings' }));
    const input = await screen.findByLabelText('Days ahead');
    await user.clear(input);
    await user.type(input, '30');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/data', expect.objectContaining({ body: { params: { days: 30 } } })),
    );
  });

  it('home: switching dashboards follows the pick by id', async () => {
    const user = userEvent.setup();
    const first = dashboard([upcoming(14)]);
    const second = { ...dashboard([attention]), id: 'd2', name: 'Cards', isDefault: false };
    vi.mocked(api.GET).mockImplementation(((url: string) =>
      Promise.resolve({ data: url === '/api/v1/dashboards' ? [first, second] : [] })) as never);
    renderWithQuery(<DashboardHome />);
    await user.click(await screen.findByRole('button', { name: 'Switch dashboard, current: Home' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Cards' }));
    expect(await screen.findByTestId('inbox-widget')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch dashboard, current: Cards' })).toBeInTheDocument();
  });

  it('editor (view mode): saves at once and takes the saved dashboard as the new baseline; Discard returns to it', async () => {
    const before = dashboard([upcoming(14)]);
    const saved = dashboard([upcoming(30)]);
    vi.mocked(api.PUT).mockResolvedValue({ data: saved } as never);
    const qc = createTestQueryClient();
    const wrapper = wrapperFor(qc);
    const { result } = renderHook(() => useDashboardEditor({ mode: 'edit', dashboard: before }), { wrapper });
    await act(async () => {
      await result.current.saveWidgetParams('w-up', { days: 30 });
    });
    expect(result.current.widgets[0].params).toEqual({ days: 30 });
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.startEdit());
    act(() => result.current.removeWidget('w-up'));
    act(() => result.current.discardAndExit());
    expect(result.current.widgets).toEqual(saved.widgets);
  });

  it('editor: a failed save rejects and leaves the widgets as they were', async () => {
    const before = dashboard([upcoming(14)]);
    vi.mocked(api.PUT).mockRejectedValue(new Error('nope'));
    const qc = createTestQueryClient();
    const wrapper = wrapperFor(qc);
    const { result } = renderHook(() => useDashboardEditor({ mode: 'edit', dashboard: before }), { wrapper });
    await expect(result.current.saveWidgetParams('w-up', { days: 30 })).rejects.toThrow('nope');
    expect(result.current.widgets[0].params).toEqual({ days: 14 });
  });
});
