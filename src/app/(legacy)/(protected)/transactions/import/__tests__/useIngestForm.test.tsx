import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { JobResponse } from '@/lib/types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'upload-toast'),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

vi.mock('@/components/jobs/jobsBus', () => ({ emitJobStarted: vi.fn() }));

// Polls while a job id is set; the captured callback lets a test settle the job.
let onSettled: ((job: JobResponse) => void) | undefined;
vi.mock('@/components/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: (jobId: string | null, cb: (job: JobResponse) => void) => {
    onSettled = cb;
    return { isPolling: Boolean(jobId) };
  },
}));

vi.mock('@/lib/api/client', () => ({ api: { POST: vi.fn() } }));

import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import { useIngestForm } from '../components/useIngestForm';

const accounts = [{ id: 'acc-1', type: 'bank_account', name: 'HDFC' }] as unknown as Account[];

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  const hook = renderHook(() => useIngestForm({ accounts }), { wrapper: Wrapper });
  act(() => {
    hook.result.current.setSelectedAccountId('acc-1');
    hook.result.current.handleFileChange({
      target: { files: [new File(['%PDF'], 'apr.pdf'), new File(['%PDF'], 'may.pdf')], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  });
  return { ...hook, invalidateSpy };
}

const settledJob = (status: JobResponse['status']) =>
  ({ id: 'job-1', status, errorMessage: null }) as unknown as JobResponse;

describe('useIngestForm upload feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSettled = undefined;
  });

  it('is busy while the upload request is still in flight', async () => {
    const post = deferred<{ data: { jobId: string } }>();
    vi.mocked(api.POST).mockReturnValue(post.promise as never);
    const { result } = setup();

    act(() => {
      void result.current.handleSubmit();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    expect(result.current.isUploading).toBe(true);
    expect(toast.loading).toHaveBeenCalledWith('Uploading 2 files…');

    await act(async () => {
      post.resolve({ data: { jobId: 'job-1' } });
    });
  });

  it('stays busy as processing once the job is enqueued, and swaps the upload toast', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { jobId: 'job-1' } } as never);
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.isSending).toBe(false);
    expect(result.current.isUploading).toBe(true);
    expect(emitJobStarted).toHaveBeenCalledWith('job-1');
    expect(result.current.files).toHaveLength(0);
    expect(toast.info).toHaveBeenCalledWith('Upload complete — processing in the background.', {
      id: 'upload-toast',
    });
  });

  it('clears the busy state and keeps the files when the upload fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.files).toHaveLength(2);
    expect(toast.dismiss).toHaveBeenCalledWith('upload-toast');
    expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to start ingestion job');
  });

  it('ignores a second submit while the first upload is in flight', async () => {
    const post = deferred<{ data: { jobId: string } }>();
    vi.mocked(api.POST).mockReturnValue(post.promise as never);
    const { result } = setup();

    act(() => {
      void result.current.handleSubmit();
    });
    await waitFor(() => expect(result.current.isSending).toBe(true));
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(api.POST).toHaveBeenCalledTimes(1);
    await act(async () => {
      post.resolve({ data: { jobId: 'job-1' } });
    });
  });

  it.each(['SUCCEEDED', 'FAILED', 'CANCELLED'] as const)(
    'refreshes the jobs panel and unlocks the form when the job ends %s',
    async (status) => {
      vi.mocked(api.POST).mockResolvedValue({ data: { jobId: 'job-1' } } as never);
      const { result, invalidateSpy } = setup();
      await act(async () => {
        await result.current.handleSubmit();
      });

      act(() => onSettled?.(settledJob(status)));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.jobs.all });
      expect(result.current.isUploading).toBe(false);
    }
  );

  it('refreshes transactions only when the job succeeds', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { jobId: 'job-1' } } as never);
    const { result, invalidateSpy } = setup();
    await act(async () => {
      await result.current.handleSubmit();
    });

    act(() => onSettled?.(settledJob('FAILED')));
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });
});
