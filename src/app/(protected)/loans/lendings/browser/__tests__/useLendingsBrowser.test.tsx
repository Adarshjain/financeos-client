import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';

import { useLendingsBrowser } from '../useLendingsBrowser';

const emptyPage = {
  content: [],
  number: 0,
  size: 50,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
};

const tx: Transaction = {
  id: 'tx-9',
  accountId: 'acc9',
  date: '2026-05-01',
  amount: -1200,
  source: 'manual',
  createdAt: '2026-05-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe('useLendingsBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: emptyPage } as never);
  });

  it('carries transactionId: selectedTx?.id in the create payload', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l1' } } as never);
    const { result } = renderHook(() => useLendingsBrowser(), { wrapper: createWrapper() });

    act(() => result.current.setSelectedCpId('cp1'));
    act(() => result.current.setAmount('1200'));
    act(() => result.current.onSelectTx(tx));

    await act(async () => {
      await result.current.handleCreateLending(submitEvent());
    });

    expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', {
      body: expect.objectContaining({ transactionId: 'tx-9' }),
    });
  });

  it('resets the selected transaction whenever the create dialog is opened or closed', () => {
    const { result } = renderHook(() => useLendingsBrowser(), { wrapper: createWrapper() });

    act(() => result.current.onSelectTx(tx));
    expect(result.current.selectedTx).not.toBeNull();

    act(() => result.current.setCreateOpen(true));
    expect(result.current.selectedTx).toBeNull();

    act(() => result.current.onSelectTx(tx));
    act(() => result.current.setCreateOpen(false));
    expect(result.current.selectedTx).toBeNull();
  });

  it('resets the selected transaction after a successful create', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l1' } } as never);
    const { result } = renderHook(() => useLendingsBrowser(), { wrapper: createWrapper() });

    act(() => result.current.setSelectedCpId('cp1'));
    act(() => result.current.setAmount('1200'));
    act(() => result.current.onSelectTx(tx));

    await act(async () => {
      await result.current.handleCreateLending(submitEvent());
    });

    expect(result.current.selectedTx).toBeNull();
  });

  it('clears the selected transaction when direction changes', () => {
    const { result } = renderHook(() => useLendingsBrowser(), { wrapper: createWrapper() });

    act(() => result.current.onSelectTx(tx));
    expect(result.current.selectedTx).not.toBeNull();

    act(() => result.current.setDirection('borrowed'));
    expect(result.current.selectedTx).toBeNull();
  });
});
