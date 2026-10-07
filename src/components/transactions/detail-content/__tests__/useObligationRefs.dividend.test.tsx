import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

import { useObligationRefs } from '../useObligationRefs';

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const onCloseAndRefresh = vi.fn();
  const { result } = renderHook(() => useObligationRefs(onCloseAndRefresh), { wrapper });
  return { result, invalidateSpy, onCloseAndRefresh };
}

describe('useObligationRefs.handleUnlinkDividend', () => {
  beforeEach(() => vi.clearAllMocks());

  it('DELETEs the dividend link, toasts, invalidates transactions + investments and closes', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
    const { result, invalidateSpy, onCloseAndRefresh } = setup();

    await act(async () => {
      await result.current.handleUnlinkDividend('div-1');
    });

    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'div-1' } },
    });
    expect(toast.success).toHaveBeenCalledWith('Unlinked from dividend');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.investments.all });
    expect(onCloseAndRefresh).toHaveBeenCalled();
    expect(result.current.unlinkingId).toBeNull();
  });

  it('shows an error toast and does not close or invalidate on failure', async () => {
    vi.mocked(api.DELETE).mockRejectedValue(new Error('boom'));
    const { result, invalidateSpy, onCloseAndRefresh } = setup();

    await act(async () => {
      await result.current.handleUnlinkDividend('div-1');
    });

    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(onCloseAndRefresh).not.toHaveBeenCalled();
    expect(result.current.unlinkingId).toBeNull();
  });
});
