import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Captures the settle callback so each test can drive the sync job to a terminal status.
let onSettled: ((job: JobResponse) => void) | undefined;
vi.mock('@/components/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: (_jobId: string | null, cb: (job: JobResponse) => void) => {
    onSettled = cb;
    return { isPolling: false };
  },
}));

vi.mock('../useGmailQueries', () => ({
  useGmailQueries: () => ({ connections: [], senders: [], attentionData: null, loading: false }),
}));

vi.mock('../useGmailMutations', () => {
  const idle = { isPending: false, mutateAsync: vi.fn() };
  return {
    useGmailMutations: () => ({
      startOAuthMutation: idle,
      syncMutation: idle,
      disconnectMutation: idle,
      retryAttentionMutation: idle,
      createSenderMutation: idle,
      updateSenderMutation: idle,
      deleteSenderMutation: idle,
    }),
  };
});

import { keys } from '@/lib/query/keys';

import { useGmailConnect } from '../useGmailConnect';

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

describe('useGmailConnect sync job settle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSettled = undefined;
  });

  it.each(['SUCCEEDED', 'FAILED', 'CANCELLED'] as const)(
    'refreshes the jobs lists when the sync job ends %s',
    (status) => {
      const { Wrapper, invalidateSpy } = createWrapper();
      renderHook(() => useGmailConnect(), { wrapper: Wrapper });

      act(() => onSettled!({ id: 'job-1', status } as JobResponse));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.jobs.all });
    }
  );

  it('refreshes transactions only when the sync succeeds', () => {
    const { Wrapper, invalidateSpy } = createWrapper();
    renderHook(() => useGmailConnect(), { wrapper: Wrapper });

    act(() => onSettled!({ id: 'job-1', status: 'FAILED' } as JobResponse));
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: keys.transactions.all });

    act(() => onSettled!({ id: 'job-2', status: 'SUCCEEDED' } as JobResponse));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });
});
