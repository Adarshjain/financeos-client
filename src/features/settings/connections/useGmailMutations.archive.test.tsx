import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import { keys } from '@/lib/query/keys';

import { useGmailMutations } from './useGmailMutations';

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useGmailMutations(), { wrapper });
  return { result, invalidate };
}

describe('useGmailMutations archive / unarchive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('connection and sender writes refresh the router once each', async () => {
    const { result } = setup();

    await act(() => result.current.disconnectMutation.mutateAsync('c1'));
    expect(routerRefresh).toHaveBeenCalledTimes(1);
    await act(() => result.current.createSenderMutation.mutateAsync({} as never));
    await act(() => result.current.updateSenderMutation.mutateAsync({ id: 's1', body: {} as never }));
    await act(() => result.current.deleteSenderMutation.mutateAsync('s1'));
    expect(routerRefresh).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['archiveAttentionMutation', '/api/v1/gmail/attention/{ledgerId}/archive'],
    ['unarchiveAttentionMutation', '/api/v1/gmail/attention/{ledgerId}/unarchive'],
  ] as const)('%s posts to its endpoint and refreshes both attention lists and the Inbox', async (name, path) => {
    const { result, invalidate } = setup();

    await act(() => result.current[name].mutateAsync('ledger-1'));

    expect(api.POST).toHaveBeenCalledWith(path, { params: { path: { ledgerId: 'ledger-1' } } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [...keys.settings.all, 'gmailAttention'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.inbox.all });
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
