import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { emitJobStarted } from '../jobsBus';
import { useJobsListPolling } from '../useJobsListPolling';

vi.mock('@/lib/api/client', () => ({ api: { GET: vi.fn() } }));

const runningJob = { id: 'job-1', type: 'STATEMENT_INGEST', status: 'RUNNING', createdAt: '2026-10-04T10:00:00Z' };

function renderPolling() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return renderHook(() => useJobsListPolling({ types: ['STATEMENT_INGEST'], size: 5 }), {
    wrapper: Wrapper,
  });
}

const getCalls = () => vi.mocked(api.GET).mock.calls.length;

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useJobsListPolling cadence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [] } } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls an idle list only every 30s', async () => {
    renderPolling();
    await advance(0);
    expect(getCalls()).toBe(1);

    await advance(29_000);
    expect(getCalls()).toBe(1);
    await advance(1_000);
    expect(getCalls()).toBe(2);
  });

  it('polls every 4s while the list shows an active job', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [runningJob] } } as never);
    renderPolling();
    await advance(0);

    await advance(4_000);
    expect(getCalls()).toBe(2);
    await advance(4_000);
    expect(getCalls()).toBe(3);
  });

  it('polls every 2s right after a job is announced, even before the list shows it', async () => {
    renderPolling();
    await advance(0);
    expect(getCalls()).toBe(1);

    await act(async () => {
      emitJobStarted('job-1');
    });
    await advance(0);
    expect(getCalls()).toBe(2);

    await advance(2_000);
    expect(getCalls()).toBe(3);
    await advance(2_000);
    expect(getCalls()).toBe(4);
  });

  it('picks up the announced job once it appears, then follows it at the active cadence', async () => {
    renderPolling();
    await advance(0);
    await act(async () => {
      emitJobStarted('job-1');
    });
    await advance(0);

    vi.mocked(api.GET).mockResolvedValue({ data: { content: [runningJob] } } as never);
    await advance(2_000);
    const afterSeen = getCalls();

    await advance(4_000);
    expect(getCalls()).toBe(afterSeen + 1);
  });

  it('falls back to the idle cadence once the grace window passes with nothing active', async () => {
    renderPolling();
    await advance(0);
    await act(async () => {
      emitJobStarted('job-1');
    });
    await advance(20_000);
    const afterGrace = getCalls();

    await advance(10_000);
    expect(getCalls()).toBe(afterGrace);
  });
});

describe('useJobsListPolling auto-expand', () => {
  const succeededJob = { ...runningJob, status: 'SUCCEEDED' };
  const otherRunning = { id: 'job-2', type: 'STATEMENT_INGEST', status: 'RUNNING', createdAt: '2026-10-04T10:00:05Z' };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [] } } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('expands an announced job that first shows up already finished', async () => {
    const { result } = renderPolling();
    await advance(0);
    expect(result.current.expandedJobIds.size).toBe(0);

    // The job finished before the refetch triggered by its announcement came back.
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [succeededJob] } } as never);
    await act(async () => {
      emitJobStarted('job-1');
    });
    await advance(10);

    expect(result.current.expandedJobIds.has('job-1')).toBe(true);
  });

  it('expands a job the list saw running once it finishes', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [runningJob] } } as never);
    const { result } = renderPolling();
    await advance(0);
    expect(result.current.expandedJobIds.has('job-1')).toBe(false);

    vi.mocked(api.GET).mockResolvedValue({ data: { content: [succeededJob] } } as never);
    await advance(4_000);
    await advance(10);

    expect(result.current.expandedJobIds.has('job-1')).toBe(true);
  });

  it('leaves finished jobs it never announced or saw running collapsed', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [succeededJob] } } as never);
    const { result } = renderPolling();
    await advance(10);

    expect(result.current.expandedJobIds.size).toBe(0);
  });

  it('does not re-expand an announced job after the user collapses it', async () => {
    const { result } = renderPolling();
    await advance(0);
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [succeededJob] } } as never);
    await act(async () => {
      emitJobStarted('job-1');
    });
    await advance(10);
    expect(result.current.expandedJobIds.has('job-1')).toBe(true);

    act(() => {
      result.current.toggleExpand('job-1');
    });
    expect(result.current.expandedJobIds.has('job-1')).toBe(false);

    // The next poll in the grace window returns the same finished job.
    await advance(2_000);
    await advance(10);
    expect(result.current.expandedJobIds.has('job-1')).toBe(false);
  });

  it('keeps following a second running job while the first one finishes', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [runningJob, otherRunning] } } as never);
    const { result } = renderPolling();
    await advance(0);

    vi.mocked(api.GET).mockResolvedValue({ data: { content: [succeededJob, otherRunning] } } as never);
    await advance(4_000);
    await advance(10);
    expect(result.current.expandedJobIds.has('job-1')).toBe(true);
    expect(result.current.expandedJobIds.has('job-2')).toBe(false);

    vi.mocked(api.GET).mockResolvedValue({
      data: { content: [succeededJob, { ...otherRunning, status: 'SUCCEEDED' }] },
    } as never);
    await advance(4_000);
    await advance(10);
    expect(result.current.expandedJobIds.has('job-2')).toBe(true);
  });
});
