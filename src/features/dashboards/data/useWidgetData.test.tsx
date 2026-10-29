import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { useWidgetData } from './useWidgetData';

const reportWidget = { id: 'w1', kind: 'report', reportId: 'r1', title: null, layout: { x: 0, y: 0, w: 50, h: 24 }, report: { name: 'Spend', type: 'KPI', available: true } } as unknown as WidgetResponse;
const templateWidget = {
  id: 'w2',
  kind: 'builtin',
  reportId: null,
  builtinKey: 'upcoming',
  params: {},
  title: null,
  layout: { x: 0, y: 0, w: 100, h: 24 },
  builtin: { key: 'upcoming', label: 'Upcoming', minW: 50, kind: 'template', templateType: 'TABLE', category: 'overview' },
} as unknown as WidgetResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.POST).mockResolvedValue({ data: { type: 'KPI', label: 'Spend', value: 1 } } as never);
});

function setup(widget: WidgetResponse, enabled: boolean) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return renderHook(({ on }) => useWidgetData(widget, 0, 50, null, on), { wrapper, initialProps: { on: enabled } });
}

describe('useWidgetData gating', () => {
  it('does not run a report widget while it is out of view', async () => {
    const { result } = setup(reportWidget, false);
    await new Promise((r) => setTimeout(r, 20));
    expect(api.POST).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('runs it once when it comes into view, and not again on later renders', async () => {
    const { result, rerender } = setup(reportWidget, false);
    rerender({ on: true });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/data', expect.objectContaining({ params: expect.objectContaining({ path: { id: 'r1' } }) }));
    rerender({ on: true });
    expect(api.POST).toHaveBeenCalledTimes(1);
  });

  it('gates a built-in template widget the same way', async () => {
    const { result, rerender } = setup(templateWidget, false);
    await new Promise((r) => setTimeout(r, 20));
    expect(api.POST).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.POST).mock.calls[0][0]).toBe('/api/v1/dashboards/builtins/{key}/data');
  });

  it('runs straight away by default (the full-page view passes no gate)', async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useWidgetData(reportWidget, 0, 50), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.data).not.toBeNull());
  });
});
