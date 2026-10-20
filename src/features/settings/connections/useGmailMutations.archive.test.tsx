import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

import { useGmailMutations } from './useGmailMutations';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } };
});

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
  });
});
