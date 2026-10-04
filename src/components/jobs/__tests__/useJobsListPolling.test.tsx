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
