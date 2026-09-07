import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import type { Transaction } from '@/lib/transaction.types';

import { useAddLendingEntry } from '../useAddLendingEntry';

type FakeCreateLending = { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };

function fakeCreateLending(): FakeCreateLending {
  return { mutateAsync: vi.fn().mockResolvedValue({ id: 'l1' }), isPending: false };
}

const tx: Transaction = {
  id: 'tx-1',
  accountId: 'acc1',
  date: '2026-03-10',
  amount: -450,
  source: 'manual',
  createdAt: '2026-03-10T00:00:00Z',
};

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe('useAddLendingEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes transactionId in the payload when a transaction is selected', async () => {
    const createLending = fakeCreateLending();
    const { result } = renderHook(() =>
      useAddLendingEntry('cp1', createLending as never),
    );

    act(() => result.current.setAddAmount('450'));
    act(() => result.current.onSelectAddTx(tx));

    await act(async () => {
      await result.current.handleAddEntry(submitEvent());
    });

    expect(createLending.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ counterpartyId: 'cp1', transactionId: 'tx-1' }),
    );
  });

  it('leaves transactionId undefined in the payload when no transaction is selected', async () => {
    const createLending = fakeCreateLending();
    const { result } = renderHook(() =>
      useAddLendingEntry('cp1', createLending as never),
    );

    act(() => result.current.setAddAmount('450'));

    await act(async () => {
      await result.current.handleAddEntry(submitEvent());
    });

    expect(createLending.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: undefined }),
    );
  });

  it('prefills amount (abs) and entry date from the selected transaction when both are empty', () => {
    const createLending = fakeCreateLending();
    const { result } = renderHook(() =>
      useAddLendingEntry('cp1', createLending as never),
    );

    act(() => result.current.setAddEntryDate(''));
    act(() => result.current.onSelectAddTx(tx));

    expect(result.current.addAmount).toBe('450');
    expect(result.current.addEntryDate).toBe('2026-03-10');
  });

  it('does not overwrite an already-filled amount or date when selecting a transaction', () => {
    const createLending = fakeCreateLending();
    const { result } = renderHook(() =>
      useAddLendingEntry('cp1', createLending as never),
    );

    act(() => result.current.setAddAmount('999'));
    act(() => result.current.setAddEntryDate('2026-01-01'));
    act(() => result.current.onSelectAddTx(tx));

    expect(result.current.addAmount).toBe('999');
    expect(result.current.addEntryDate).toBe('2026-01-01');
  });

  it('changing direction clears the selected transaction', () => {
    const createLending = fakeCreateLending();
    const { result } = renderHook(() =>
      useAddLendingEntry('cp1', createLending as never),
    );

    act(() => result.current.onSelectAddTx(tx));
    expect(result.current.addSelectedTx).not.toBeNull();

    act(() => result.current.setAddDir('borrowed'));

    expect(result.current.addSelectedTx).toBeNull();
  });

  it('resets amount, notes and expected date on a successful submit', async () => {
    const createLending = fakeCreateLending();
    const { result } = renderHook(() =>
      useAddLendingEntry('cp1', createLending as never),
    );

    act(() => {
      result.current.setAddAmount('450');
      result.current.setAddNotes('dinner split');
      result.current.setAddExpDate('2026-04-01');
    });

    await act(async () => {
      await result.current.handleAddEntry(submitEvent());
    });

    expect(result.current.addAmount).toBe('');
    expect(result.current.addNotes).toBe('');
    expect(result.current.addExpDate).toBe('');
    expect(result.current.addEntryOpen).toBe(false);
  });
});
