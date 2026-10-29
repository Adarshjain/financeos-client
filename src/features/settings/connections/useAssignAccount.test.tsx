import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';

import { useAssignAccount } from './useAssignAccount';

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup(initial: { id: string } | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(({ item }) => useAssignAccount(item, vi.fn()), { wrapper, initialProps: { item: initial } });
}

describe('useAssignAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: [{ id: 'acc-1', name: 'HDFC' }, { id: 'acc-2', name: 'ICICI' }] } as never);
  });

  it('clears the picked account and the error when it opens for a different item', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result, rerender } = setup({ id: 'a' });
    await waitFor(() => expect(result.current.effectiveAccountId).toBe('acc-1'));
    act(() => result.current.selectAccount('acc-2'));
    await act(() => result.current.submit());
    expect(result.current.errorMessage).toBeTruthy();
    expect(result.current.effectiveAccountId).toBe('acc-2');

    rerender({ item: { id: 'b' } });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.effectiveAccountId).toBe('acc-1');
  });

  it('clears stale state when the dialog closes', async () => {
    const { result, rerender } = setup({ id: 'a' });
    await waitFor(() => expect(result.current.effectiveAccountId).toBe('acc-1'));
    act(() => result.current.selectAccount('acc-2'));
    rerender({ item: null });
    expect(result.current.effectiveAccountId).toBe('acc-1');
  });
});
