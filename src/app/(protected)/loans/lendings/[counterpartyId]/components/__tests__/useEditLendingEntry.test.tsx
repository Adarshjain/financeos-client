import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import type { LendingResponse } from '@/lib/types';

import { useCounterpartyMutations } from '../useCounterpartyMutations';
import { useEditLendingEntry } from '../useEditLendingEntry';

type FakeMutation = { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };

function fakeMutations(overrides: Partial<Record<'updateLending' | 'linkTransaction' | 'unlinkTransaction', FakeMutation>> = {}) {
  return {
    updateLending: overrides.updateLending ?? { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false },
    linkTransaction: overrides.linkTransaction ?? { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false },
    unlinkTransaction: overrides.unlinkTransaction ?? { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false },
  };
}

const lendingWithTx: LendingResponse = {
  id: 'l1',
  counterpartyId: 'cp1',
  counterpartyName: 'Rahul',
  amount: 500,
  direction: 'lent',
  entryDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00Z',
  expectedReturnDate: '2026-02-01',
  notes: 'trip cash',
  transaction: { id: 'tx-a', accountId: 'acc1', accountName: 'HDFC', date: '2026-01-01', signedAmount: -500 },
  transactionId: 'tx-a',
};

const newTx: Transaction = {
  id: 'tx-b',
  accountId: 'acc2',
  date: '2026-01-05',
  amount: -600,
  source: 'manual',
  createdAt: '2026-01-05T00:00:00Z',
};

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe('useEditLendingEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opening edit seeds fields + current linked transaction from LendingResponse.transaction', () => {
    const mutations = fakeMutations();
    const { result } = renderHook(() => useEditLendingEntry(mutations as never));

    act(() => result.current.handleOpenEditLending(lendingWithTx));

    expect(result.current.lendingDir).toBe('lent');
    expect(result.current.lendingAmount).toBe('500');
    expect(result.current.lendingDate).toBe('2026-01-01');
    expect(result.current.lendingExpDate).toBe('2026-02-01');
    expect(result.current.lendingNotes).toBe('trip cash');
    expect(result.current.editSelectedTx).toEqual(lendingWithTx.transaction);
    expect(result.current.editLendingOpen).toBe(true);
  });

  it('save with the link unchanged only calls updateLending, no link/unlink', async () => {
    const mutations = fakeMutations();
    const { result } = renderHook(() => useEditLendingEntry(mutations as never));
    act(() => result.current.handleOpenEditLending(lendingWithTx));

    await act(async () => {
      await result.current.handleUpdateLending(submitEvent());
    });

    expect(mutations.updateLending.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutations.linkTransaction.mutateAsync).not.toHaveBeenCalled();
    expect(mutations.unlinkTransaction.mutateAsync).not.toHaveBeenCalled();
  });

  it('save after choosing a different transaction calls updateLending then linkTransaction with the new id', async () => {
    const mutations = fakeMutations();
    const { result } = renderHook(() => useEditLendingEntry(mutations as never));
    act(() => result.current.handleOpenEditLending(lendingWithTx));
    act(() => result.current.onSelectEditTx(newTx));

    await act(async () => {
      await result.current.handleUpdateLending(submitEvent());
    });

    expect(mutations.updateLending.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutations.linkTransaction.mutateAsync).toHaveBeenCalledWith({ id: 'l1', transactionId: 'tx-b' });
    expect(mutations.unlinkTransaction.mutateAsync).not.toHaveBeenCalled();

    const updateOrder = mutations.updateLending.mutateAsync.mock.invocationCallOrder[0];
    const linkOrder = mutations.linkTransaction.mutateAsync.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(linkOrder);
  });

  it('save after Remove calls updateLending then unlinkTransaction', async () => {
    const mutations = fakeMutations();
    const { result } = renderHook(() => useEditLendingEntry(mutations as never));
    act(() => result.current.handleOpenEditLending(lendingWithTx));
    act(() => result.current.onClearEditTx());

    await act(async () => {
      await result.current.handleUpdateLending(submitEvent());
    });

    expect(mutations.updateLending.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutations.unlinkTransaction.mutateAsync).toHaveBeenCalledWith('l1');
    expect(mutations.linkTransaction.mutateAsync).not.toHaveBeenCalled();
  });

  it('exposes editSelectedTx as the lock signal: truthy once linked, null after Remove', () => {
    const mutations = fakeMutations();
    const { result } = renderHook(() => useEditLendingEntry(mutations as never));

    act(() => result.current.handleOpenEditLending(lendingWithTx));
    expect(result.current.editSelectedTx).toBeTruthy();

    act(() => result.current.onClearEditTx());
    expect(result.current.editSelectedTx).toBeNull();
  });

  it('surfaces an API error via toast and keeps the dialog open', async () => {
    const rejection = new ApiError(400, { code: 'ERR', message: 'Custom failure reason', timestamp: '' });
    vi.mocked(api.PUT).mockRejectedValue(rejection as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => {
        const mutations = useCounterpartyMutations('cp1');
        return useEditLendingEntry(mutations as never);
      },
      { wrapper: Wrapper },
    );

    act(() => result.current.handleOpenEditLending(lendingWithTx));

    await act(async () => {
      await result.current.handleUpdateLending(submitEvent());
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Custom failure reason'));
    expect(result.current.editLendingOpen).toBe(true);
  });
});
