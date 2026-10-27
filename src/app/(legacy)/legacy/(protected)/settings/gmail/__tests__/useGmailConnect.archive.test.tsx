import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

vi.mock('@/features/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: () => ({ isPolling: false }),
}));

const queries = vi.hoisted(() => ({
  attentionData: null as { totalPages: number } | null,
  archivedData: null as { totalPages: number } | null,
}));
vi.mock('@/features/settings/connections/useGmailQueries', () => ({
  useGmailQueries: () => ({ connections: [], senders: [], loading: false, ...queries }),
}));

const archiveMutateAsync = vi.fn();
const unarchiveMutateAsync = vi.fn();
vi.mock('@/features/settings/connections/useGmailMutations', () => {
  const idle = { isPending: false, mutateAsync: vi.fn() };
  return {
    useGmailMutations: () => ({
      startOAuthMutation: idle,
      syncMutation: idle,
      disconnectMutation: idle,
      retryAttentionMutation: idle,
      archiveAttentionMutation: { isPending: false, mutateAsync: archiveMutateAsync },
      unarchiveAttentionMutation: { isPending: false, mutateAsync: unarchiveMutateAsync },
      createSenderMutation: idle,
      updateSenderMutation: idle,
      deleteSenderMutation: idle,
    }),
  };
});

import { toastError } from '@/lib/toastError';

import { useGmailConnect } from '../useGmailConnect';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useGmailConnect archive handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.attentionData = null;
    queries.archivedData = null;
  });

  it('archives an item and confirms', async () => {
    archiveMutateAsync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGmailConnect(), { wrapper });
    await act(() => result.current.handleArchiveAttentionItem('ledger-1'));
    expect(archiveMutateAsync).toHaveBeenCalledWith('ledger-1');
    expect(toast.success).toHaveBeenCalledWith('Item archived');
  });

  it('surfaces an archive failure', async () => {
    const err = new Error('nope');
    archiveMutateAsync.mockRejectedValue(err);
    const { result } = renderHook(() => useGmailConnect(), { wrapper });
    await act(() => result.current.handleArchiveAttentionItem('ledger-1'));
    expect(toastError).toHaveBeenCalledWith(err, 'Failed to archive Gmail attention item');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('unarchives an item and confirms', async () => {
    unarchiveMutateAsync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGmailConnect(), { wrapper });
    await act(() => result.current.handleUnarchiveAttentionItem('ledger-1'));
    expect(unarchiveMutateAsync).toHaveBeenCalledWith('ledger-1');
    expect(toast.success).toHaveBeenCalledWith('Item moved back to Needs Attention');
  });

  it('surfaces an unarchive failure', async () => {
    const err = new Error('nope');
    unarchiveMutateAsync.mockRejectedValue(err);
    const { result } = renderHook(() => useGmailConnect(), { wrapper });
    await act(() => result.current.handleUnarchiveAttentionItem('ledger-1'));
    expect(toastError).toHaveBeenCalledWith(err, 'Failed to unarchive Gmail attention item');
  });
});

describe('useGmailConnect page clamp', () => {
  beforeEach(() => {
    queries.attentionData = null;
    queries.archivedData = null;
  });

  it('steps back to the last page when the current active page empties out', () => {
    queries.attentionData = { totalPages: 3 };
    const { result, rerender } = renderHook(() => useGmailConnect(), { wrapper });
    act(() => result.current.setAttentionPage(2));
    expect(result.current.attentionPage).toBe(2);

    queries.attentionData = { totalPages: 2 };
    rerender();
    expect(result.current.attentionPage).toBe(1);
  });

  it('steps back on the archived pager independently', () => {
    queries.attentionData = { totalPages: 3 };
    queries.archivedData = { totalPages: 2 };
    const { result, rerender } = renderHook(() => useGmailConnect(), { wrapper });
    act(() => result.current.setArchivedPage(1));

    queries.archivedData = { totalPages: 1 };
    rerender();
    expect(result.current.archivedPage).toBe(0);
    expect(result.current.attentionPage).toBe(0);
  });

  it('goes to page 0 when everything on the list is gone', () => {
    queries.attentionData = { totalPages: 2 };
    const { result, rerender } = renderHook(() => useGmailConnect(), { wrapper });
    act(() => result.current.setAttentionPage(1));

    queries.attentionData = { totalPages: 0 };
    rerender();
    expect(result.current.attentionPage).toBe(0);
  });

  it('leaves a valid page alone', () => {
    queries.attentionData = { totalPages: 3 };
    const { result, rerender } = renderHook(() => useGmailConnect(), { wrapper });
    act(() => result.current.setAttentionPage(1));
    rerender();
    expect(result.current.attentionPage).toBe(1);
  });
});
