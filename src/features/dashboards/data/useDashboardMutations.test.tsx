import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/components/ds', async (orig) => ({ ...(await orig<typeof import('@/components/ds')>()), showToast: vi.fn() }));

import type { DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

import { useAddWidgetNow, useDeleteDashboard, useSaveDashboard } from './useDashboardMutations';

const widget = (id: string): WidgetResponse =>
  ({ id, kind: 'builtin', builtinKey: 'upcoming', params: {}, title: null, reportId: null, layout: { x: 0, y: 0, w: 50, h: 24 } }) as unknown as WidgetResponse;
const dash = (widgets: WidgetResponse[], over: Partial<DashboardResponse> = {}): DashboardResponse =>
  ({ id: 'd1', name: 'Home', description: null, isDefault: true, updatedAt: 'x', createdAt: 'x', widgets, ...over }) as DashboardResponse;

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, wrapper };
}

beforeEach(() => vi.clearAllMocks());

describe('useAddWidgetNow', () => {
  it('PUTs from the latest cached dashboard, not the stale snapshot it was given', async () => {
    const { queryClient, wrapper } = setup();
    const stale = dash([widget('w1')]);
    const latest = dash([widget('w1'), widget('w2')]);
    queryClient.setQueryData(keys.dashboards.list(), [latest]);
    api.PUT.mockImplementation(async (_url: string, opts: { body: { widgets: { id?: string }[] } }) => ({
      data: dash([widget('w1'), widget('w2'), widget('w3')]),
      body: opts.body,
    }));
    const { result } = renderHook(() => useAddWidgetNow(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ dashboard: stale, widget: widget('w3') });
    });
    const sent = api.PUT.mock.calls[0][1].body.widgets.map((w: { id?: string }) => w.id);
    expect(sent).toEqual(['w1', 'w2', 'w3']);
  });

  it('falls back to the given dashboard when nothing is cached', async () => {
    const { wrapper } = setup();
    api.PUT.mockResolvedValue({ data: dash([widget('w1'), widget('w3')]) });
    const { result } = renderHook(() => useAddWidgetNow(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ dashboard: dash([widget('w1')]), widget: widget('w3') });
    });
    expect(api.PUT.mock.calls[0][1].body.widgets).toHaveLength(2);
  });
});

describe('dashboard writes invalidate only the lists', () => {
  const seed = (queryClient: QueryClient) => {
    queryClient.setQueryData(keys.dashboards.list(), [dash([])]);
    queryClient.setQueryData(keys.dashboards.byId('d1'), dash([]));
    queryClient.setQueryData(keys.dashboards.summary(), {});
    queryClient.setQueryData(keys.dashboards.builtins(), []);
    queryClient.setQueryData(keys.dashboards.widget('w1', {}), { data: 1 });
  };
  const stale = (queryClient: QueryClient, key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated;

  it('Save leaves widget data and the built-ins catalog alone', async () => {
    const { queryClient, wrapper } = setup();
    seed(queryClient);
    api.PUT.mockResolvedValue({ data: dash([]) });
    const { result } = renderHook(() => useSaveDashboard(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'd1', body: {} as never });
    });
    await waitFor(() => expect(stale(queryClient, keys.dashboards.summary())).toBe(true));
    expect(stale(queryClient, keys.dashboards.list())).toBe(true);
    expect(stale(queryClient, keys.dashboards.byId('d1'))).toBe(true);
    expect(stale(queryClient, keys.dashboards.builtins())).toBeFalsy();
    expect(stale(queryClient, keys.dashboards.widget('w1', {}))).toBeFalsy();
  });

  it('Delete leaves widget data and the built-ins catalog alone', async () => {
    const { queryClient, wrapper } = setup();
    seed(queryClient);
    api.DELETE.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteDashboard(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('d1');
    });
    expect(stale(queryClient, keys.dashboards.list())).toBe(true);
    expect(stale(queryClient, keys.dashboards.builtins())).toBeFalsy();
    expect(stale(queryClient, keys.dashboards.widget('w1', {}))).toBeFalsy();
  });
});
