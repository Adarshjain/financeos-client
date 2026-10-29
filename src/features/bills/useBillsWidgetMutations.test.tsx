import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';

import { useBillsWidgetMutations } from './useBillsWidgetMutations';

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBillsWidgetMutations(), { wrapper });
}

describe('useBillsWidgetMutations unmark paid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.DELETE).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: {} } as never);
  });

  it('refreshes the router once after the mark is removed', async () => {
    const { result } = setup();
    await act(() => result.current.rowActions.onUnmarkPaid({ statementId: 's1' } as CardBillResponse));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
  });

  it('does not refresh when the bill has no statement', async () => {
    const { result } = setup();
    await act(() => result.current.rowActions.onUnmarkPaid({} as CardBillResponse));
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('refreshes the router once after mark paid and after saving details', async () => {
    const { result } = setup();
    await act(async () => {
      result.current.rowActions.onMarkPaid({ statementId: 's1' } as CardBillResponse);
      result.current.rowActions.onSetDetails({ statementId: 's1' } as CardBillResponse);
    });
    await act(() => result.current.markPaidDialog.onSubmit({} as never));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    await act(() => result.current.detailsDialog.onSubmit({} as never));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(2));
  });

  it('does not refresh when mark paid fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup();
    await act(async () => result.current.rowActions.onMarkPaid({ statementId: 's1' } as CardBillResponse));
    await act(() => result.current.markPaidDialog.onSubmit({} as never));
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
