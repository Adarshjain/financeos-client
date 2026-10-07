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

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

import { useObligationRefs } from '../useObligationRefs';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, invalidateSpy };
}

describe('useObligationRefs — lending unlink invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unlinking a lending ref invalidates transactions, lendings and the loans summary, then closes', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: null } as never);
    const onCloseAndRefresh = vi.fn();
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useObligationRefs(onCloseAndRefresh), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleUnlink('l1');
    });

    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
    expect(onCloseAndRefresh).toHaveBeenCalled();
    expect(result.current.unlinkingId).toBeNull();
  });
});
