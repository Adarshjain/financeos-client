import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

import { serverApi as api } from '@/lib/api/server';

import { useLlmKeyMutations } from './useLlmKeyMutations';

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLlmKeyMutations(), { wrapper });
}

describe('useLlmKeyMutations router (the Settings list shows the key count)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: [] } as never);
  });

  it('refreshes the router after a key is added and after one is deleted', async () => {
    const { result } = setup();
    await act(() => result.current.createMutation.mutateAsync({} as never));
    expect(routerRefresh).toHaveBeenCalledTimes(1);
    await act(() => result.current.deleteMutation.mutateAsync('k1'));
    expect(routerRefresh).toHaveBeenCalledTimes(2);
  });

  it('does not refresh when a write fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup();
    await act(() => result.current.createMutation.mutateAsync({} as never).catch(() => undefined));
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('does not refresh for reorder or a key test', async () => {
    const { result } = setup();
    await act(() => result.current.updatePositionMutation.mutateAsync({ id: 'k1', position: 0 }));
    await act(() => result.current.testMutation.mutateAsync({ id: 'k1' }));
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
