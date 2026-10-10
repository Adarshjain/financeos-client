import { act, renderHook } from '@testing-library/react';
import type { FormEvent, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAddLendingForm } from '@/components/lendings/useAddLendingForm';
import { api } from '@/lib/api/client';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const rahul: CounterpartyResponse = {
  id: 'cp1', name: 'Rahul', netPosition: 1500, totalLent: 1500, totalBorrowed: 0, repaidToYou: 0, repaidByYou: 0, entryCount: 1,
};
const submit = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe('useAddLendingForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 20:00 UTC on 9 Oct is already 10 Oct in India.
    vi.setSystemTime(new Date('2026-10-09T20:00:00Z'));
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l1' } } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty, dated today in India (not UTC)', () => {
    const { result } = renderHook(() => useAddLendingForm(), { wrapper });
    expect(result.current.party).toBeNull();
    expect(result.current.entryType).toBe('lent');
    expect(result.current.amount).toBe('');
    expect(result.current.entryDate).toBe('2026-10-10');
    expect(result.current.open).toBe(false);
  });

  it('a preset seeds the person, entry type and amount', () => {
    const { result } = renderHook(
      () => useAddLendingForm({ preset: { counterparty: rahul, entryType: 'repaid_to_me', amount: 1500 } }),
      { wrapper },
    );
    expect(result.current.party).toEqual({ kind: 'existing', counterparty: rahul });
    expect(result.current.entryType).toBe('repaid_to_me');
    expect(result.current.amount).toBe('1500');
  });

  it('opening or closing resets to the preset', () => {
    const { result } = renderHook(
      () => useAddLendingForm({ preset: { counterparty: rahul, entryType: 'repaid_to_me', amount: 1500 } }),
      { wrapper },
    );
    act(() => result.current.setParty({ kind: 'new', name: 'Asha' }));
    act(() => result.current.setEntryType('lent'));
    act(() => result.current.setAmount('20'));
    act(() => result.current.setOpen(false));
    expect(result.current.party).toEqual({ kind: 'existing', counterparty: rahul });
    expect(result.current.entryType).toBe('repaid_to_me');
    expect(result.current.amount).toBe('1500');
  });

  it('creates the entry for the preset person, then blanks amount/notes/return date, closes and reports', async () => {
    const onCreated = vi.fn();
    const { result } = renderHook(
      () => useAddLendingForm({ preset: { counterparty: rahul, entryType: 'repaid_to_me' }, onCreated }),
      { wrapper },
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.setAmount('700'));
    act(() => result.current.setNotes(' cash '));
    act(() => result.current.setExpectedReturnDate('2026-11-01'));
    await act(async () => {
      await result.current.handleCreateLending(submit());
    });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', {
      body: expect.objectContaining({
        counterpartyId: 'cp1', direction: 'borrowed', kind: 'settlement', amount: 700, entryDate: '2026-10-10', notes: 'cash',
      }),
    });
    expect(toast.success).toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(result.current.open).toBe(false);
    expect(result.current.amount).toBe('');
    expect(result.current.notes).toBe('');
    expect(result.current.expectedReturnDate).toBe('');
  });

  it('refuses to submit without a person or a positive amount', async () => {
    const { result } = renderHook(() => useAddLendingForm(), { wrapper });
    await act(async () => {
      await result.current.handleCreateLending(submit());
    });
    expect(toast.error).toHaveBeenCalledWith('Pick a person');
    act(() => result.current.setParty({ kind: 'new', name: 'Asha' }));
    await act(async () => {
      await result.current.handleCreateLending(submit());
    });
    expect(toast.error).toHaveBeenCalledWith('Amount must be greater than zero');
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('a failed create keeps the form open with its values and does not report success', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('down'));
    const onCreated = vi.fn();
    const { result } = renderHook(() => useAddLendingForm({ onCreated }), { wrapper });
    act(() => result.current.setOpen(true));
    act(() => result.current.setParty({ kind: 'new', name: 'Asha' }));
    act(() => result.current.setAmount('300'));
    await act(async () => {
      await result.current.handleCreateLending(submit());
    });
    expect(onCreated).not.toHaveBeenCalled();
    expect(result.current.open).toBe(true);
    expect(result.current.amount).toBe('300');
  });
});
