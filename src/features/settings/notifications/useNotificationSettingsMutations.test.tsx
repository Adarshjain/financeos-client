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

import { useNotificationSettingsMutations } from './useNotificationSettings';

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useNotificationSettingsMutations(), { wrapper });
}

describe('useNotificationSettingsMutations router refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
  });

  it('refreshes once for each settings write, including mutes', async () => {
    const { result } = setup();
    await act(() => result.current.update.mutateAsync({} as never));
    await act(() => result.current.subscribe.mutateAsync({} as never));
    await act(() => result.current.unsubscribe.mutateAsync('https://push/e'));
    await act(() => result.current.mute.mutateAsync({ accountId: 'a1', muted: true }));
    await act(() => result.current.muteLoan.mutateAsync({ loanId: 'l1', muted: true }));
    expect(routerRefresh).toHaveBeenCalledTimes(5);
  });

  it('does not refresh for the test push', async () => {
    const { result } = setup();
    await act(() => result.current.sendTest.mutateAsync());
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
