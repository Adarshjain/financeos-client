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
    amount: 900,
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

type Ref = NonNullable<PickerTransaction['obligationRefs']>[number];

const dividendRef: Ref = { kind: 'DIVIDEND', id: 'div-1', label: 'INFY dividend' };
const lendingRef: Ref = { kind: 'LENDING', id: 'op-1', label: 'Rahul Sharma' };
const loanRef: Ref = { kind: 'LOAN_PAYMENT', id: 'op-2', label: 'EMI #2' };

async function candidateIds(props: Parameters<typeof useTransactionPicker>[0], rows: PickerTransaction[]) {
  (api.POST as Mock).mockResolvedValue({ data: pagedResponse(rows) });
  const { result } = renderHook(() => useTransactionPicker(props));
  await waitFor(() => expect(api.POST).toHaveBeenCalled());
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result.current.candidates.map((c) => c.id);
}

describe('useTransactionPicker dividend mode (shareableKind="DIVIDEND")', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const rows = () => [
    makeTxn({ id: 'clean', date: '2026-07-20' }),
    makeTxn({ id: 'dividend-shared', date: '2026-07-21', obligationRefs: [dividendRef] }),
    makeTxn({ id: 'lending-ref', date: '2026-07-22', obligationRefs: [lendingRef] }),
    makeTxn({ id: 'loan-ref', date: '2026-07-23', obligationRefs: [loanRef] }),
  ];

  it('keeps rows with no refs and rows already shared by other dividends; drops LENDING/LOAN rows', async () => {
    const ids = await candidateIds({ type: 'CREDIT', shareableKind: 'DIVIDEND', active: true }, rows());
    expect(ids.sort()).toEqual(['clean', 'dividend-shared']);
  });

  it('drops a row that mixes a dividend ref with another family', async () => {
    const mixed = makeTxn({ id: 'mixed', obligationRefs: [dividendRef, lendingRef] });
    const ids = await candidateIds({ type: 'CREDIT', shareableKind: 'DIVIDEND', active: true }, [mixed]);
    expect(ids).toEqual([]);
  });

  it('default (LENDING) mode is unchanged: keeps LENDING-shared rows, drops DIVIDEND and LOAN rows', async () => {
    const ids = await candidateIds({ type: 'CREDIT', active: true }, rows());
    expect(ids.sort()).toEqual(['clean', 'lending-ref']);
  });

  it('excludeAnyObligationRef still wins over shareableKind="DIVIDEND"', async () => {
    const ids = await candidateIds(
      { type: 'CREDIT', shareableKind: 'DIVIDEND', excludeAnyObligationRef: true, active: true },
      rows(),
    );
    expect(ids).toEqual(['clean']);
  });
});
