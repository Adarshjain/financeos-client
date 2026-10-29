import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ unstable_rethrow: (e: unknown) => { throw e; }, useRouter: () => router, usePathname: () => '/dashboards/d1', useSearchParams: () => new URLSearchParams() }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

// The grid's own drag and resize are checked in its tests: here it is a list with two buttons that reorder and widen.
vi.mock('@/components/ds/WidgetGrid/WidgetGrid', async (orig) => {
  const actual = await orig<typeof import('@/components/ds/WidgetGrid/WidgetGrid')>();
  return {
    ...actual,
    WidgetGrid: ({ items, layout, onLayoutChange, editing, footer }: import('@/components/ds/WidgetGrid/WidgetGrid').WidgetGridProps) => {
      const current = layout ?? items.map((i) => ({ id: i.id, width: i.width }));
      return (
        <div data-testid="grid" data-editing={editing ? 'true' : undefined}>
          {items.map((item) => (
            <div key={item.id} data-testid="grid-item" data-id={item.id} data-width={item.width}>
              {item.children}
              {editing ? item.editActions : null}
            </div>
          ))}
          {editing ? (
            <>
              <button onClick={() => onLayoutChange?.([...current].reverse())}>reverse order</button>
              <button onClick={() => onLayoutChange?.(current.map((c, i) => (i === 0 ? { ...c, width: 'full' as const } : c)))}>widen first</button>
            </>
          ) : null}
          {footer}
        </div>
      );
    },
  };
});

vi.mock('../frame/DashboardWidgetFrame', () => ({
  DashboardWidgetFrame: ({ widget, issue, onSaveSettings }: { widget: { id: string; title?: string | null; report?: { name?: string | null }; builtin?: { label?: string } }; issue?: string; onSaveSettings?: unknown }) => (
    <div data-testid="frame" data-id={widget.id} data-can-save-settings={onSaveSettings ? 'true' : 'false'}>
      {widget.title ?? widget.builtin?.label ?? widget.report?.name}
      {issue ? <span>{issue}</span> : null}
    </div>
  ),
}));

import type { BuiltinWidgetResponse, DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { DashboardScreen, NAME_REQUIRED } from './DashboardScreen';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const report = (id: string, name: string, layout: Partial<WidgetResponse['layout']> = {}): WidgetResponse => ({
  id,
  kind: 'report',
  reportId: `r-${id}`,
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24, ...layout },
  report: { name, type: 'KPI', available: true },
});
const header = (id: string, title: string): WidgetResponse => ({ id, kind: 'text', reportId: null, title, params: null, layout: { x: 0, y: 0, w: 100, h: 5 } });
const cardWidget = (params: Record<string, unknown> = {}): WidgetResponse => ({
  id: 'cu',
  kind: 'builtin',
  reportId: null,
  builtinKey: 'card_utilisation',
  params,
  title: null,
  layout: { x: 50, y: 5, w: 50, h: 24 },
  builtin: { key: 'card_utilisation', label: 'Card utilisation', minW: 50, kind: 'component', category: 'cards' } as WidgetResponse['builtin'],
});

const dashboard = (over: Partial<DashboardResponse> = {}): DashboardResponse =>
  ({
    id: 'd1',
    name: 'Money overview',
    description: null,
    isDefault: false,
    updatedAt: '2026-10-20T00:00:00Z',
    widgets: [header('h1', 'This month'), report('a', 'Spend', { y: 5 }), report('b', 'Rewards', { x: 50, y: 5 })],
    ...over,
  }) as DashboardResponse;

const builtins: BuiltinWidgetResponse[] = [
  { key: 'net_worth', label: 'Net worth', description: 'Assets minus loans', category: 'overview', kind: 'template', minW: 25, params: [] },
  {
    key: 'card_utilisation',
    label: 'Card utilisation',
    description: 'Limit used per card',
    category: 'cards',
    kind: 'component',
    minW: 50,
    params: [{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }],
  },
];
const reports = [{ id: 'r9', name: 'Spend by category', type: 'TABLE', datasource: 'transactions', dashboards: [] }] as unknown as ReportSummaryResponse[];

function serve() {
  api.GET.mockImplementation(async (path: string) => {
    if (path === '/api/v1/dashboards/builtins') return { data: builtins };
    if (path === '/api/v1/reports') return { data: reports };
    if (path === '/api/v1/accounts') return { data: [] };
    if (path === '/api/v1/dashboards/{id}') return { data: dashboard() };
    return { data: undefined };
  });
}

function show(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.dashboards.builtins(), builtins);
  queryClient.setQueryData(keys.reports.list(), reports);
  return renderWithQuery(ui, { queryClient });
}

const ids = () => screen.getAllByTestId('grid-item').map((i) => i.dataset.id);
const widths = () => screen.getAllByTestId('grid-item').map((i) => i.dataset.width);
const putBody = () => api.PUT.mock.calls[0][1].body;

beforeEach(() => {
  vi.clearAllMocks();
  serve();
  api.PUT.mockImplementation(async (_path: string, { body }: { body: Record<string, unknown> }) => ({ data: { ...dashboard(), ...body, updatedAt: '2026-10-25T00:00:00Z' } }));
  api.POST.mockImplementation(async (_path: string, { body }: { body: Record<string, unknown> }) => ({ data: { ...dashboard(), ...body, id: 'new-id' } }));
});

describe('viewing a dashboard', () => {
  it('shows the widgets in order and width, the count without headers, and Set as default and Edit', () => {
    show(<DashboardScreen dashboard={dashboard()} />);
    expect(ids()).toEqual(['h1', 'a', 'b']);
    expect(widths()).toEqual(['full', 'half', 'half']);
    expect(screen.getByText('2 widgets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set as default' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save dashboard' })).toBeNull();
    // Widget settings save straight away in view mode.
    expect(screen.getAllByTestId('frame')[0]).toHaveAttribute('data-can-save-settings', 'true');
  });

  it('lays widgets out by their saved y then x, not their stored order', () => {
    const d = dashboard({ widgets: [report('b', 'Rewards', { x: 50, y: 0 }), report('a', 'Spend', { x: 0, y: 0 })] });
    show(<DashboardScreen dashboard={d} />);
    expect(ids()).toEqual(['a', 'b']);
  });

  it('says so when there is nothing on the dashboard, and Add widget opens the editor and the picker', async () => {
    show(<DashboardScreen dashboard={dashboard({ widgets: [] })} />);
    expect(screen.getByText('No widgets yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    expect(await screen.findByRole('dialog', { name: /Add widget/ })).toBeInTheDocument();
    // Behind the dialog the page is already editing.
    expect(screen.getByRole('button', { name: 'Save dashboard', hidden: true })).toBeInTheDocument();
  });

  it('Set as default makes it the default and confirms; the button then clears it', async () => {
    show(<DashboardScreen dashboard={dashboard()} />);
    await user.click(screen.getByRole('button', { name: 'Set as default' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Default dashboard set'));
    expect(api.PUT.mock.calls[0][1].body).toMatchObject({ isDefault: true, name: 'Money overview' });
    expect(await screen.findByRole('button', { name: 'Clear default' })).toBeInTheDocument();
  });

  it('refuses to set the default when the dashboard changed meanwhile', async () => {
    api.GET.mockImplementation(async (path: string) => (path === '/api/v1/dashboards/{id}' ? { data: dashboard({ updatedAt: '2026-10-24T00:00:00Z' }) } : { data: [] }));
    show(<DashboardScreen dashboard={dashboard()} />);
    await user.click(screen.getByRole('button', { name: 'Set as default' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/changed since the page was loaded/), { tone: 'danger' }));
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('the top bar has no + while viewing', () => {
    show(<DashboardScreen dashboard={dashboard()} />);
    expect(screen.queryByRole('button', { name: /^Add$/ })).toBeNull();
  });
});

/** The top bar's + opens its menu; Add header is its second row. */
const addHeaderFromTopBar = async () => {
  await user.click(screen.getByRole('button', { name: /^Add$/ }));
  await user.click(screen.getByRole('menuitem', { name: 'Add header' }));
};

describe('editing a dashboard', () => {
  const edit = async () => {
    show(<DashboardScreen dashboard={dashboard({ description: 'Everything' })} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
  };

  it('Edit shows the name and description, the bottom bar and the arranged widgets, with no Add header button by the name', async () => {
    await edit();
    expect(screen.getByLabelText('Dashboard name')).toHaveValue('Money overview');
    expect(screen.getAllByLabelText(/Description/)[0]).toHaveValue('Everything');
    expect(screen.queryByRole('button', { name: 'Add header' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save dashboard' })).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'true');
    expect(screen.getByRole('button', { name: 'Add a widget' })).toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('opens straight into editing with ?edit=1 (startEditing) and takes the flag off the address', () => {
    window.history.replaceState(null, '', '/dashboards/d1?edit=1');
    show(<DashboardScreen dashboard={dashboard()} startEditing />);
    expect(screen.getByRole('button', { name: 'Save dashboard' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('Discard with nothing changed leaves editing without asking', async () => {
    await edit();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('a change shows "Unsaved changes"; Discard asks, Keep editing stays and Discard restores the saved name', async () => {
    await edit();
    const name = screen.getByLabelText('Dashboard name');
    await user.clear(name);
    await user.type(name, 'Renamed');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Discard changes?')).toBeInTheDocument();
    expect(within(dialog).getByText('Your edits to Money overview will be lost.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Dashboard name')).toHaveValue('Renamed');
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }));
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Dashboard name')).toHaveValue('Money overview');
  });

  it('removing a widget takes it off the grid and makes the draft dirty', async () => {
    await edit();
    await user.click(screen.getByRole('button', { name: /Remove widget Spend/ }));
    expect(ids()).toEqual(['h1', 'b']);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('Save writes the new order and widths in the 100-column layout and returns to the view', async () => {
    await edit();
    await user.click(screen.getByRole('button', { name: 'reverse order' }));
    expect(ids()).toEqual(['b', 'a', 'h1']);
    await user.click(screen.getByRole('button', { name: 'widen first' }));
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Dashboard saved'));
    expect(api.PUT.mock.calls[0][0]).toBe('/api/v1/dashboards/{id}');
    const body = putBody();
    expect(body).toMatchObject({ name: 'Money overview', description: 'Everything', isDefault: false });
    expect(body.widgets.map((w: WidgetResponse) => [w.id, w.layout.x, w.layout.y, w.layout.w])).toEqual([
      ['b', 0, 0, 100],
      ['a', 0, 24, 50],
      ['h1', 0, 48, 100],
    ]);
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('refuses to save without a name: says so at the field, toasts, focuses it and writes nothing', async () => {
    await edit();
    await user.clear(screen.getByLabelText('Dashboard name'));
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));
    expect(screen.getByText(NAME_REQUIRED)).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Couldn't save the dashboard. Fix the fields marked in red.", { tone: 'danger' });
    await waitFor(() => expect(screen.getByLabelText('Dashboard name')).toHaveFocus());
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('refuses to save a widget that is missing something, marking it and focusing its fix', async () => {
    show(<DashboardScreen dashboard={dashboard({ widgets: [cardWidget()] })} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));
    expect(screen.getByText('Pick a card for this widget.')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Couldn't save the dashboard. Fix the fields marked in red.", { tone: 'danger' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus());
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('every widget has Settings: a built-in sets params and title, a report widget only its title', async () => {
    show(<DashboardScreen dashboard={dashboard({ widgets: [cardWidget({ accountId: 'c1' }), report('a', 'Spend')] })} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const buttons = screen.getAllByRole('button', { name: 'Settings' });
    expect(buttons).toHaveLength(2);
    // In reading order: the report widget first, then the built-in.
    await user.click(buttons[1]);
    expect(await screen.findByRole('dialog', { name: /Widget settings · Card utilisation/ })).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Widget settings · Spend/ });
    expect(within(dialog).queryByText('Card')).toBeNull();
    await user.type(within(dialog).getByPlaceholderText('Spend'), 'My spend');
    await user.click(within(dialog).getByRole('button', { name: 'Save widget' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    const saved = putBody().widgets.find((w: WidgetResponse) => w.id === 'a');
    expect(saved).toMatchObject({ title: 'My spend', reportId: 'r-a' });
    expect(putBody().widgets.find((w: WidgetResponse) => w.id === 'cu').params).toEqual({ accountId: 'c1' });
  });

  it('a failed save keeps the draft and says so', async () => {
    api.PUT.mockRejectedValue(new Error('down'));
    await edit();
    await user.clear(screen.getByLabelText('Dashboard name'));
    await user.type(screen.getByLabelText('Dashboard name'), 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't save the dashboard. Try again.", { tone: 'danger' }));
    expect(screen.getByLabelText('Dashboard name')).toHaveValue('Renamed');
  });

  it('Add header puts an untitled header on top with its title field focused; typing titles it', async () => {
    await edit();
    await addHeaderFromTopBar();
    const field = screen.getAllByLabelText('Header')[0];
    await waitFor(() => expect(field).toHaveFocus());
    expect(screen.getAllByTestId('grid-item')).toHaveLength(4);
    await user.type(field, 'Bills');
    expect(screen.getAllByTestId('grid-item')[0]).toContainElement(field);
    expect(field).toHaveValue('Bills');
    await user.type(screen.getAllByLabelText(/Description/)[1], 'Due soon');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('an untitled header blocks Save and marks its field', async () => {
    await edit();
    await addHeaderFromTopBar();
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));
    expect(screen.getByText('Give this header a title.')).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });
});

describe('a new dashboard', () => {
  it('starts editing an empty draft with Cancel and Create, and Add widget / Add header', () => {
    show(<DashboardScreen />);
    expect(screen.getByLabelText('Dashboard name')).toHaveValue('');
    expect(screen.getByText('No widgets yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add widget' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Add header' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add dashboard' })).toBeInTheDocument();
  });

  it('Cancel with nothing typed goes back to Dashboards', async () => {
    show(<DashboardScreen />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.push).toHaveBeenCalledWith('/dashboards');
  });

  it('Cancel after typing asks first; Discard leaves', async () => {
    show(<DashboardScreen />);
    await user.type(screen.getByLabelText('Dashboard name'), 'Cards');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.push).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboards'));
  });

  it('Create without a name says so and creates nothing', async () => {
    show(<DashboardScreen />);
    await user.click(screen.getByRole('button', { name: 'Add dashboard' }));
    expect(screen.getByText(NAME_REQUIRED)).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('adds a built-in from the picker and creates the dashboard, then opens it', async () => {
    show(<DashboardScreen />);
    await user.type(screen.getByLabelText('Dashboard name'), 'Cards and loans');
    await user.click(screen.getAllByRole('button', { name: 'Add widget' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Add widget/ });
    await user.click(within(dialog).getByRole('radio', { name: /Net worth/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Add to board' }));
    await waitFor(() => expect(ids()).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Add dashboard' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Dashboard created'));
    expect(api.POST.mock.calls[0][0]).toBe('/api/v1/dashboards');
    expect(api.POST.mock.calls[0][1].body).toMatchObject({
      name: 'Cards and loans',
      isDefault: false,
      widgets: [{ kind: 'builtin', builtinKey: 'net_worth', layout: { x: 0, y: 0, w: 25 } }],
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboards/new-id'));
  });

  it('the top bar + opens a menu with Add widget and Add header; Add widget opens the picker', async () => {
    show(<DashboardScreen />);
    await user.click(screen.getByRole('button', { name: /^Add$/ }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Add widget', 'Add header']);
    await user.click(screen.getByRole('menuitem', { name: 'Add widget' }));
    expect(await screen.findByRole('dialog', { name: /Add widget/ })).toBeInTheDocument();
  });

  it('the top bar + Add header adds an untitled header', async () => {
    show(<DashboardScreen />);
    await addHeaderFromTopBar();
    expect(screen.getAllByLabelText('Header')).toHaveLength(1);
  });

  it('the Discard confirmation is not red: it confirms with the default tone', async () => {
    show(<DashboardScreen />);
    await user.type(screen.getByLabelText('Dashboard name'), 'Cards');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' });
    expect(confirm.className).not.toMatch(/danger/);
  });
});
