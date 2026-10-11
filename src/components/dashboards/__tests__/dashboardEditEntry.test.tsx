import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));

import { AddWidgetDialog } from '@/components/dashboards/AddWidgetDialog';
import { useDashboardEditor } from '@/components/dashboards/editor/useDashboardEditor';
import { api } from '@/lib/api/client';
import type { DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

const report: WidgetResponse = {
  id: 'r1', kind: 'report', reportId: 'rep', title: null, layout: { x: 0, y: 0, w: 50, h: 10 },
  report: { name: 'R', type: 'KPI', available: true },
};
const board = (over: Partial<DashboardResponse> = {}): DashboardResponse =>
  ({ id: 'd1', name: 'Home', description: null, isDefault: true, updatedAt: 't', widgets: [report], ...over }) as DashboardResponse;

function mount(props: Partial<Parameters<typeof useDashboardEditor>[0]> = {}, qc: QueryClient = createTestQueryClient()) {
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useDashboardEditor({ mode: 'edit', dashboard: board(), ...props }), { wrapper: Wrapper });
}

describe('useDashboardEditor: startEditing and onExit', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('startEditing opens in edit mode; without it an existing dashboard opens in view mode', () => {
    expect(mount({ startEditing: true }).result.current.editing).toBe(true);
    expect(mount().result.current.editing).toBe(false);
  });

  it('discard while editing restores the saved dashboard and calls onExit', () => {
    const onExit = vi.fn();
    const { result } = mount({ startEditing: true, onExit });
    act(() => result.current.removeWidget('r1'));
    act(() => result.current.discardAndExit());
    expect(result.current.widgets).toEqual([report]);
    expect(result.current.editing).toBe(false);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('back from the view calls onExit instead of going to /dashboards', () => {
    const onExit = vi.fn();
    const { result } = mount({ onExit });
    act(() => result.current.discardAndExit());
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a successful save calls onExit once it has left edit mode', async () => {
    const onExit = vi.fn();
    vi.mocked(api.PUT).mockResolvedValue({ data: board({ name: 'Renamed' }) } as never);
    const { result } = mount({ startEditing: true, onExit });
    await act(async () => { await result.current.save(); });
    expect(result.current.editing).toBe(false);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('a failed save stays in edit mode and does not call onExit', async () => {
    const onExit = vi.fn();
    vi.mocked(api.PUT).mockRejectedValue(new Error('boom'));
    const { result } = mount({ startEditing: true, onExit });
    await act(async () => { await result.current.save(); });
    expect(result.current.editing).toBe(true);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('a save in edit mode puts the saved dashboard in the list and detail caches', async () => {
    // No component observes these caches here, so keep them from being collected.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const other = board({ id: 'd2', name: 'Other' });
    qc.setQueryData(keys.dashboards.list(), [board(), other]);
    const saved = board({ name: 'Renamed' });
    vi.mocked(api.PUT).mockResolvedValue({ data: saved } as never);
    // Hold the refetch the save triggers, so the caches show what the save itself stored.
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    const { result } = mount({ startEditing: true }, qc);
    await act(async () => { await result.current.save(); });
    expect(qc.getQueryData(keys.dashboards.list())).toEqual([saved, other]);
    expect(qc.getQueryData(keys.dashboards.byId('d1'))).toEqual(saved);
  });

  it('drops ?edit from the address once opened from it, keeping any other params', () => {
    window.history.replaceState(null, '', '/dashboards/d1?edit=1&x=2');
    mount({ startEditing: true });
    expect(window.location.pathname).toBe('/dashboards/d1');
    expect(window.location.search).toBe('?x=2');
  });

  it('leaves the address alone when not opened for editing', () => {
    window.history.replaceState(null, '', '/dashboards/d1?edit=1');
    mount();
    expect(window.location.search).toBe('?edit=1');
  });
});

describe('AddWidgetDialog (controlled)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
  });

  it('renders no button of its own and stays closed until open is set', () => {
    renderWithQuery(<AddWidgetDialog open={false} onOpenChange={vi.fn()} reports={[]} onAdd={vi.fn()} onAddBuiltin={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Add widget' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opening re-checks the built-in catalog', async () => {
    const qc = createTestQueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    renderWithQuery(<AddWidgetDialog open onOpenChange={vi.fn()} reports={[]} onAdd={vi.fn()} onAddBuiltin={vi.fn()} />, { queryClient: qc });
    expect(await screen.findByRole('heading', { name: 'Add a widget' })).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.dashboards.builtins() });
  });

  it('closing (Escape) asks the owner to close it', async () => {
    const onOpenChange = vi.fn();
    renderWithQuery(<AddWidgetDialog open onOpenChange={onOpenChange} reports={[]} onAdd={vi.fn()} onAddBuiltin={vi.fn()} />);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
