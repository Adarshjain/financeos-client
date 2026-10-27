import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

import { useEpfMutations } from './useEpfMutations';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('useEpfMutations.refresh', () => {
  it('re-reads the investment, transaction, EPF and inbox queries and the page', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useEpfMutations(), { wrapper });
    await result.current.refresh();
    const invalidated = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
    expect(invalidated).toContain(JSON.stringify(['epf']));
    expect(invalidated).toContain(JSON.stringify(keys.inbox.all));
    expect(invalidated).toContain(JSON.stringify(keys.transactions.all));
    expect(router.refresh).toHaveBeenCalled();
  });
});
