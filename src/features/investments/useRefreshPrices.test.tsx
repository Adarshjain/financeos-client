import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PriceRefreshResult } from '@/lib/types';
import { pinClock } from '@/test/pinClock';

import { refreshResultMessage, useRefreshPrices } from './useRefreshPrices';

pinClock();

const api = vi.hoisted(() => ({ POST: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const bus = vi.hoisted(() => ({ emitJobStarted: vi.fn() }));
vi.mock('@/features/jobs/jobsBus', () => bus);

const polling = vi.hoisted(() => ({
  settle: null as null | ((job: unknown) => void),
  active: null as string | null,
  isPolling: true,
}));
vi.mock('@/features/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: (jobId: string | null, onSettled: (job: unknown) => void) => {
    polling.active = jobId;
    polling.settle = onSettled;
    return { isPolling: polling.isPolling };
  },
}));

vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

const notify = { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() };
const onSettled = vi.fn();

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useRefreshPrices({ notify, onSettled }), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  polling.isPolling = true;
  api.POST.mockResolvedValue({ data: { jobId: 'job-1' } });
});

describe('refreshResultMessage', () => {
  const base: PriceRefreshResult = { refreshed: 3, skipped: 1, failed: [], asOf: '2026-10-13' };

  it('says how many prices were updated and skipped', () => {
    expect(refreshResultMessage(base)).toEqual({ message: 'Updated 3 prices (as of 13 Oct); 1 skipped.', failed: false });
    expect(refreshResultMessage({ ...base, refreshed: 1 }).message).toContain('Updated 1 price (');
  });

  it('adds each failure with its instrument and reason, and flags the result', () => {
    const result = refreshResultMessage({ ...base, failed: [{ instrumentId: 'i1', instrumentName: 'Infosys', reason: 'no quote' }] });
    expect(result.failed).toBe(true);
    expect(result.message).toContain('Failed: Infosys: no quote');
  });
});

describe('useRefreshPrices', () => {
  it('starts the job, tells the app, reports it started and keeps the job id', async () => {
    const { result } = setup();
    expect(result.current.jobId).toBeNull();
    await act(async () => {
      await result.current.refresh();
    });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/prices/refresh', { params: { query: {} } });
    expect(bus.emitJobStarted).toHaveBeenCalledWith('job-1');
    expect(notify.info).toHaveBeenCalledWith('Price refresh started');
    expect(result.current.jobId).toBe('job-1');
    expect(polling.active).toBe('job-1');
    expect(result.current.busy).toBe(true);
  });

  it('reports a finished job as a success and calls onSettled, keeping the job id', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      polling.isPolling = false;
      polling.settle!({ status: 'SUCCEEDED', result: { refreshed: 2, skipped: 0, failed: [], asOf: '2026-10-13' } });
    });
    expect(notify.success).toHaveBeenCalledWith('Updated 2 prices (as of 13 Oct); 0 skipped.');
    expect(onSettled).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.jobId).toBe('job-1');
  });

  it('warns when some prices failed', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      polling.settle!({ status: 'SUCCEEDED', result: { refreshed: 1, skipped: 0, failed: [{ instrumentId: 'i1', reason: 'no quote' }], asOf: null } });
    });
    expect(notify.warning).toHaveBeenCalledWith(expect.stringContaining('Failed: i1: no quote'));
  });

  it('reports a failed and a cancelled job', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      polling.settle!({ status: 'FAILED', errorMessage: 'Yahoo is down' });
    });
    expect(notify.error).toHaveBeenCalledWith('Yahoo is down');
    await act(async () => {
      polling.settle!({ status: 'CANCELLED' });
    });
    expect(notify.info).toHaveBeenCalledWith('Price refresh cancelled');
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('starts nothing and keeps quiet when the request fails', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    const { result } = setup();
    await act(async () => {
      await result.current.refresh();
    });
    expect(bus.emitJobStarted).not.toHaveBeenCalled();
    expect(notify.info).not.toHaveBeenCalled();
    expect(result.current.jobId).toBeNull();
  });
});
