import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: vi.fn() }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

import { showToast } from '@/components/ds';
import { useJobMutations } from '@/features/jobs/useJobMutations';
import { serverApi as api } from '@/lib/api/server';
import { markDineroToaster } from '@/lib/toastTarget';

function setup(options?: Parameters<typeof useJobMutations>[0]) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useJobMutations(options), { wrapper });
}

describe('useJobMutations router refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'j2' } } as never);
  });

  it('refreshes the router after cancel and after retry', async () => {
    const { result } = setup();
    act(() => result.current.cancel('j1'));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    act(() => result.current.retry('j1'));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(2));
  });

  it('does not refresh when the call fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.cancel('j1'));
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('hands the retried job to onRetried instead of refreshing', async () => {
    const onRetried = vi.fn();
    const { result } = setup({ onRetried });
    act(() => result.current.retry('j1'));
    await waitFor(() => expect(onRetried).toHaveBeenCalledWith({ id: 'j2' }));
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});

describe('useJobMutations on a Dinero page', () => {
  it('shows the retry success on the Dinero toaster', async () => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'j2' } } as never);
    const release = markDineroToaster();
    const { result } = setup();
    act(() => result.current.retry('j1'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Job retried', expect.objectContaining({ tone: 'success' })));
    release();
  });
});
