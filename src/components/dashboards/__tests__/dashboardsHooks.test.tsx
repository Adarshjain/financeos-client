import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));

import { useDashboardEditor } from '@/components/dashboards/editor/useDashboardEditor';
import { RestoreHomeButton } from '@/components/dashboards/RestoreHomeButton';
import { useDuplicateBuiltin } from '@/components/dashboards/useDuplicateBuiltin';
import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse, DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

const upcomingDef: BuiltinWidgetResponse = {
  category: 'overview',
  key: 'upcoming', label: 'Upcoming', description: 'Obligations', kind: 'template', minW: 100,
  templateType: 'TABLE', datasource: 'obligations',
  templateDefinition: { filters: [{ field: 'dueDate', operator: 'next_x_days', value: { amount: 14 } }] },
  params: [{ name: 'days', type: 'int', required: false, min: 1, max: 90, defaultValue: 14 }],
};

function wrapperFor(qc = createTestQueryClient()) {
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, Wrapper };
}

describe('useDuplicateBuiltin', () => {
  const resolved = (over: Record<string, unknown> = {}) => ({
    key: 'upcoming', label: 'Upcoming', type: 'TABLE', datasource: 'obligations',
    definition: { filters: [{ field: 'dueDate', operator: 'next_x_days', value: { amount: 30 } }] },
    windowAsOf: null,
    ...over,
  });
  const serve = (definition: unknown, report: unknown = { id: 'rep-new', name: 'Upcoming' }) =>
    vi.mocked(api.POST).mockImplementation(((url: string) =>
      Promise.resolve({ data: url === '/api/v1/reports' ? report : definition })) as never);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('asks the server to resolve the template with the widget params, then saves that definition named after the built-in', async () => {
    serve(resolved());
    const { qc, Wrapper } = wrapperFor();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDuplicateBuiltin(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync({ builtinKey: 'upcoming', params: { days: 30 } }); });
    expect(api.POST).toHaveBeenNthCalledWith(1, '/api/v1/dashboards/builtins/{key}/definition', {
      params: { path: { key: 'upcoming' } },
      body: { params: { days: 30 } },
    });
    expect(api.POST).toHaveBeenNthCalledWith(2, '/api/v1/reports', {
      body: {
        name: 'Upcoming', type: 'TABLE', datasource: 'obligations',
        definition: { filters: [{ field: 'dueDate', operator: 'next_x_days', value: { amount: 30 } }] },
      },
    });
    // The catalog is no longer needed to duplicate.
    expect(api.GET).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.reports.all });
    expect(toast.success).toHaveBeenCalledWith('Saved "Upcoming" to your reports', { action: expect.anything() });
    const action = toast.success.mock.calls[0][1].action;
    action.onClick();
    expect(router.push).toHaveBeenCalledWith('/reports/rep-new');
  });

  it('a copy fixed to a reward window says so (dd/mm/yyyy) in the toast', async () => {
    serve(resolved({ key: 'cap_headroom', label: 'Cap headroom', windowAsOf: '2026-10-01' }), { id: 'r2', name: 'Cap headroom' });
    const { Wrapper } = wrapperFor();
    const { result } = renderHook(() => useDuplicateBuiltin(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync({ builtinKey: 'cap_headroom', params: {} }); });
    expect(toast.success).toHaveBeenCalledWith('Saved "Cap headroom" to your reports', {
      description: 'This copy is fixed to the window open on 01/10/2026.',
      action: expect.anything(),
    });
  });

  it('a refused resolve (component built-in, unknown key) reports the error and saves nothing', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('Not a template'));
    const { Wrapper } = wrapperFor();
    const { result } = renderHook(() => useDuplicateBuiltin(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync({ builtinKey: 'attention', params: {} }).catch(() => {}); });
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0][1]).toBe('Failed to duplicate as a report');
  });

  it('errors when the server returns no definition or no report', async () => {
    const { Wrapper } = wrapperFor();
    serve(undefined);
    const { result } = renderHook(() => useDuplicateBuiltin(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync({ builtinKey: 'upcoming', params: {} }).catch(() => {}); });
    expect(api.POST).toHaveBeenCalledTimes(1);
    serve(resolved(), null);
    await act(async () => { await result.current.mutateAsync({ builtinKey: 'upcoming', params: {} }).catch(() => {}); });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(2);
  });
});

describe('RestoreHomeButton', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('restores, toasts and refreshes the server-rendered page', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'd1' } } as never);
    const user = userEvent.setup();
    renderWithQuery(<RestoreHomeButton />);
    await user.click(screen.getByRole('button', { name: /restore default home/i }));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/home/restore');
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Home dashboard restored');
  });

  it('shows an error and does not refresh when it fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('x'));
    const user = userEvent.setup();
    renderWithQuery(<RestoreHomeButton />);
    await user.click(screen.getByRole('button', { name: /restore default home/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][1]).toBe('Failed to restore the Home dashboard');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('is disabled while the restore is in flight', async () => {
    vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
    const user = userEvent.setup();
    renderWithQuery(<RestoreHomeButton />);
    await user.click(screen.getByRole('button', { name: /restore default home/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /restore default home/i })).toBeDisabled());
  });
});

const L = { x: 0, y: 0, w: 100, h: 24 };
const builtinWidget: WidgetResponse = {
  id: 'b1', kind: 'builtin', reportId: null, builtinKey: 'upcoming', params: { days: 7, z: null }, title: ' T ', layout: L,
  builtin: { category: 'overview', key: 'upcoming', label: 'Upcoming', minW: 100, kind: 'template', templateType: 'TABLE', href: '/upcoming' },
};
const reportWidget: WidgetResponse = {
  id: 'r1', kind: 'report', reportId: 'rep', title: null, layout: { x: 0, y: 24, w: 50, h: 10 },
  report: { name: 'R', type: 'KPI', available: true },
};
const dashboard = (widgets: WidgetResponse[]): DashboardResponse =>
  ({ id: 'd1', name: 'Home', description: 'desc', isDefault: true, widgets }) as DashboardResponse;

describe('useDashboardEditor save', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mount = (mode: 'create' | 'edit', d?: DashboardResponse) => {
    const { Wrapper } = wrapperFor();
    return renderHook(() => useDashboardEditor({ mode, dashboard: d }), { wrapper: Wrapper });
  };

  it('sends built-in widgets as kind/builtinKey/params and reports as reportId, trimming titles', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: dashboard([builtinWidget, reportWidget]) } as never);
    const { result } = mount('edit', dashboard([builtinWidget, reportWidget]));
    await act(async () => { await result.current.save(); });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/dashboards/{id}', {
      params: { path: { id: 'd1' } },
      body: {
        name: 'Home', description: 'desc', isDefault: true,
        widgets: [
          { id: 'b1', kind: 'builtin', reportId: null, builtinKey: 'upcoming', params: { days: 7 }, title: 'T', layout: L },
          { id: 'r1', kind: 'report', reportId: 'rep', builtinKey: null, params: null, title: null, layout: { x: 0, y: 24, w: 50, h: 10 } },
        ],
      },
    });
    expect(toast.success).toHaveBeenCalledWith('Dashboard saved');
  });

  it('blocks save with a blank name', async () => {
    const { result } = mount('create');
    await act(async () => { await result.current.save(); });
    expect(toast.error).toHaveBeenCalledWith('Name the dashboard.');
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('blocks save when a built-in is narrower than its minimum', async () => {
    const narrow = { ...builtinWidget, layout: { ...L, w: 60 } };
    const { result } = mount('edit', dashboard([narrow]));
    await act(async () => { await result.current.save(); });
    expect(toast.error).toHaveBeenCalledWith('Upcoming must be at least 100 of 100 columns wide.');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('blocks save when a built-in is no longer known', async () => {
    const { result } = mount('edit', dashboard([{ ...builtinWidget, builtin: undefined }]));
    await act(async () => { await result.current.save(); });
    expect(toast.error).toHaveBeenCalledWith('Widget 1 is no longer available — remove it to save.');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('create mode posts and navigates to the new dashboard', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { ...dashboard([]), id: 'new' } } as never);
    const { result } = mount('create');
    act(() => result.current.setName('  Mine '));
    await act(async () => { await result.current.save(); });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards', {
      body: { name: 'Mine', description: undefined, isDefault: false, widgets: [] },
    });
    expect(router.push).toHaveBeenCalledWith('/dashboards/new');
  });

  it('adding a built-in twice dirties the editor and saves both', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: dashboard([]) } as never);
    const { result } = mount('edit', dashboard([]));
    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.addBuiltin(upcomingDef, { days: 7 });
      result.current.addBuiltin(upcomingDef, { days: 7 });
    });
    expect(result.current.widgets).toHaveLength(2);
    expect(result.current.isDirty).toBe(true);
    await act(async () => { await result.current.save(); });
    const body = vi.mocked(api.PUT).mock.calls[0][1] as { body: { widgets: Array<{ builtinKey: string; params: unknown }> } };
    expect(body.body.widgets.map((w) => [w.builtinKey, w.params])).toEqual([['upcoming', { days: 7 }], ['upcoming', { days: 7 }]]);
  });

  it('removing dirties the editor and discard restores the saved widgets', () => {
    const { result } = mount('edit', dashboard([builtinWidget]));
    act(() => result.current.removeWidget('b1'));
    expect(result.current.widgets).toHaveLength(0);
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.startEdit());
    act(() => result.current.discardAndExit());
    expect(result.current.widgets).toHaveLength(1);
    expect(result.current.editing).toBe(false);
  });
});
