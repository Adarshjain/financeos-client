import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});

import { useJobStatusPolling } from '@/components/jobs/useJobStatusPolling';
import { api } from '@/lib/api/client';
import type { JobResponse } from '@/lib/types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const runningJob: JobResponse = {
  id: 'job-1',
  type: 'INVESTMENT_IMPORT_COMMIT',
  status: 'RUNNING',
  triggerSource: 'USER',
  cancelRequested: false,
  attempt: 1,
  createdAt: '2026-01-01T00:00:00Z',
};

const succeededJob: JobResponse = { ...runningJob, status: 'SUCCEEDED' };

describe('useJobStatusPolling', () => {
  it('does not fetch and reports no polling when jobId is null', () => {
    const { result } = renderHook(() => useJobStatusPolling(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.job).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('polls a RUNNING job, stops on SUCCEEDED, and fires onSettled exactly once', async () => {
    (api.GET as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: runningJob })
      .mockResolvedValue({ data: succeededJob });
    const onSettled = vi.fn();

    const { result, rerender } = renderHook(
      ({ jobId }: { jobId: string | null }) => useJobStatusPolling(jobId, onSettled),
      { wrapper: createWrapper(), initialProps: { jobId: 'job-1' } }
    );

    await waitFor(() => expect(result.current.job?.status).toBe('RUNNING'));
    expect(result.current.isPolling).toBe(true);
    expect(onSettled).not.toHaveBeenCalled();

    // The hook's own refetchInterval will eventually re-fetch and observe SUCCEEDED;
    // trigger that deterministically instead of waiting on the real 1.5s timer.
    await waitFor(() => expect(result.current.job?.status).toBe('SUCCEEDED'), {
      timeout: 3000,
      interval: 50,
    });

    expect(result.current.isPolling).toBe(false);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'job-1', status: 'SUCCEEDED' })
    );

    // A later rerender for the same job must not re-fire the settle callback.
    rerender({ jobId: 'job-1' });
    await new Promise((r) => setTimeout(r, 20));
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
