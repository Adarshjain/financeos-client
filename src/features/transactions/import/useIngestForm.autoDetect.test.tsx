import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(() => 't'), dismiss: vi.fn() },
}));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));
vi.mock('@/features/jobs/jobsBus', () => ({ emitJobStarted: vi.fn() }));
vi.mock('@/features/jobs/useJobStatusPolling', () => ({ useJobStatusPolling: () => ({ isPolling: false }) }));
vi.mock('@/lib/api/client', () => ({ api: { POST: vi.fn() } }));

import { api } from '@/lib/api/client';

import { useIngestForm } from './useIngestForm';

const accounts = [{ id: 'acc-1', type: 'bank_account', name: 'HDFC' }] as unknown as Account[];

function setup(initialAccountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const hook = renderHook(() => useIngestForm({ accounts, initialAccountId }), {
    wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  act(() => {
    hook.result.current.handleFileChange({
      target: { files: [new File(['%PDF'], 'apr.pdf')], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  });
  return hook;
}

describe('useIngestForm account choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { jobId: 'job-1' } } as never);
  });

  it('detects automatically by default and posts to /ingest', async () => {
    const { result } = setup();
    expect(result.current.selectedAccountId).toBe('');
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.POST).mock.calls[0][0]).toBe('/api/v1/ingest');
  });

  it('uses the account path once an account is picked', async () => {
    const { result } = setup('acc-1');
    await act(async () => {
      await result.current.handleSubmit();
    });
    const [path, init] = vi.mocked(api.POST).mock.calls[0] as unknown as [string, { params: { path: { accountId: string } } }];
    expect(path).toBe('/api/v1/accounts/{accountId}/ingest');
    expect(init.params.path.accountId).toBe('acc-1');
  });
});
