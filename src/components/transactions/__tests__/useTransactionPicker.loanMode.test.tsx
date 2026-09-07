import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { type PickerTransaction, useTransactionPicker } from '@/components/transactions/useTransactionPicker';
import { api } from '@/lib/api/client';

type Mock = ReturnType<typeof vi.fn>;

function makeTxn(overrides: Partial<PickerTransaction> & { id: string }): PickerTransaction {
  return {
    accountId: 'acc-1',
    amount: -100,
    categories: [],
    createdAt: '2026-07-25T00:00:00Z',
    date: '2026-07-25',
    isTransactionExcluded: false,
    isTransactionUnderMonitoring: false,
    links: [],
    obligationRefs: [],
    reviewReasons: [],
    source: 'manual',
    updatedAt: '2026-07-25T00:00:00Z',
    description: 'Transaction',
    ...overrides,
  } as PickerTransaction;
}

function pagedResponse(content: PickerTransaction[]) {
  return {
    content,
    number: 0,
    size: 50,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

function lastSearchFilters() {
  const calls = (api.POST as Mock).mock.calls;
  const call = calls[calls.length - 1];
  return call[1].body.filters as { field: string; operator: string; value: unknown }[];
}

describe('useTransactionPicker loan-mode `type` filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  it('filters by type DEBIT when `type` is set with no `direction`', async () => {
    renderHook(() => useTransactionPicker({ type: 'DEBIT', active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters()).toContainEqual({ field: 'type', operator: 'is', value: 'DEBIT' });
  });

  it('omits the type clause entirely when `type` is explicitly null', async () => {
    renderHook(() => useTransactionPicker({ type: null, active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters().some((f) => f.field === 'type')).toBe(false);
  });

  it('`type` overrides a `direction`-derived filter when both are given', async () => {
    renderHook(() => useTransactionPicker({ direction: 'lent', type: 'CREDIT', active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters()).toContainEqual({ field: 'type', operator: 'is', value: 'CREDIT' });
  });

  it('falls back to no type filter when neither `type` nor `direction` is given', async () => {
    renderHook(() => useTransactionPicker({ active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters().some((f) => f.field === 'type')).toBe(false);
  });
});

describe('useTransactionPicker `excludeAnyObligationRef`', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides a row carrying a LENDING-only obligation ref when excludeAnyObligationRef is true', async () => {
    const lendingRef = makeTxn({
      id: 'lending-ref',
      obligationRefs: [{ kind: 'LENDING', id: 'op-1', label: 'Rahul Sharma' }],
    });
    const clean = makeTxn({ id: 'clean' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([lendingRef, clean]) });

    const { result } = renderHook(() =>
      useTransactionPicker({ type: 'DEBIT', excludeAnyObligationRef: true, active: true }),
    );

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['clean']);
    });
  });

  it('hides a row carrying a non-LENDING obligation ref when excludeAnyObligationRef is true', async () => {
    const loanRef = makeTxn({
      id: 'loan-ref',
      obligationRefs: [{ kind: 'LOAN_PAYMENT', id: 'op-1', label: 'EMI #2' }],
    });
    const clean = makeTxn({ id: 'clean' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([loanRef, clean]) });

    const { result } = renderHook(() =>
      useTransactionPicker({ type: 'DEBIT', excludeAnyObligationRef: true, active: true }),
    );

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['clean']);
    });
  });

  it('keeps a row carrying only a LENDING obligation ref by default (excludeAnyObligationRef omitted)', async () => {
    const lendingRef = makeTxn({
      id: 'lending-ref',
      obligationRefs: [{ kind: 'LENDING', id: 'op-1', label: 'Rahul Sharma' }],
    });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([lendingRef]) });

    const { result } = renderHook(() => useTransactionPicker({ type: 'DEBIT', active: true }));

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['lending-ref']);
    });
  });
});
