import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

import { api } from '@/lib/api/client';

import { useLlmKeyMutations } from './useLlmKeyMutations';

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLlmKeyMutations(), { wrapper });
}

describe('useLlmKeyMutations router refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: [] } as never);
  });

  it('refreshes once per create, delete and reorder', async () => {
    const { result } = setup();
    await act(() => result.current.createMutation.mutateAsync({} as never));
    expect(routerRefresh).toHaveBeenCalledTimes(1);
    await act(() => result.current.deleteMutation.mutateAsync('k1'));
    expect(routerRefresh).toHaveBeenCalledTimes(2);
    await act(() => result.current.updatePositionMutation.mutateAsync({ id: 'k1', position: 0 }));
    expect(routerRefresh).toHaveBeenCalledTimes(3);
  });

  it('does not refresh for a key test', async () => {
    const { result } = setup();
    await act(() => result.current.testMutation.mutateAsync({ id: 'k1' }));
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
