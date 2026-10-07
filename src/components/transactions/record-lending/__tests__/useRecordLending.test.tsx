import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { api } from '@/lib/api/client';
import type { CounterpartyResponse, LendingResponse } from '@/lib/lending.types';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { useRecordLending } from '../useRecordLending';

const debitTx: Transaction = {
  id: 'tx-1',
  accountId: 'acc1',
  date: '2026-05-01',
  amount: -1200,
  source: 'manual',
  createdAt: '2026-05-01T00:00:00Z',
};

const cp1: CounterpartyResponse = {
  id: 'cp1',
  name: 'Rahul Sharma',
  netPosition: 0,
  totalLent: 0,
  totalBorrowed: 0,
  entryCount: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, invalidateSpy };
}

// Recording a lending from the transaction Link dialog changes the lent /
// borrowed / net totals on the Lendings Ledger page, which are cached under
// keys.loans.summary() — not under the keys.lendings.all prefix.
describe('useRecordLending — ledger totals (loans summary) invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [] } } as never);
  });

  it('recording a new entry invalidates lendings, transactions and the loans summary, then closes', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l1' } } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange, onSuccess }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setParty({ kind: 'existing', counterparty: cp1 }));
    await waitFor(() => expect(result.current.canSubmitNew).toBe(true));

    act(() => result.current.handleSubmitNew());

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', {
      body: expect.objectContaining({ counterpartyId: 'cp1', transactionId: 'tx-1', direction: 'lent' }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('attaching to an existing entry invalidates lendings, transactions and the loans summary, then closes', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'l1' } } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange, onSuccess }),
      { wrapper: Wrapper },
    );

    act(() => result.current.handleAttach('l1'));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
      body: { transactionId: 'tx-1' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('useRecordLending — party selection and suggestion', () => {
  const describedTx: Transaction = { ...debitTx, description: 'Dinner with Rahul Sharma' };

  function mockGetByPath(handlers: Record<string, unknown>) {
    vi.mocked(api.GET).mockImplementation(
      ((path: string) => Promise.resolve({ data: handlers[path] ?? { content: [] } })) as never,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the server for a suggestion from the description and applies it once, flagged as suggested', async () => {
    mockGetByPath({ '/api/v1/counterparties/suggest': { counterparty: cp1 } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: describedTx, open: true, onOpenChange: vi.fn() }),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(result.current.party).toEqual({ kind: 'existing', counterparty: cp1 }),
    );
    expect(result.current.suggestedId).toBe('cp1');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties/suggest', {
      params: { query: { text: 'Dinner with Rahul Sharma' } },
    });

    // The user can still change their mind; the suggestion does not snap back.
    act(() => result.current.setParty({ kind: 'new', name: 'Kavita' }));
    await waitFor(() => expect(result.current.party).toEqual({ kind: 'new', name: 'Kavita' }));
    expect(result.current.suggestedId).toBe('cp1');
  });

  it('a suggestion that arrives after the user already picked someone does not override the pick', async () => {
    let resolveSuggest!: (value: unknown) => void;
    vi.mocked(api.GET).mockImplementation(
      ((path: string) =>
        path === '/api/v1/counterparties/suggest'
          ? new Promise((resolve) => {
              resolveSuggest = resolve;
            })
          : Promise.resolve({ data: { content: [] } })) as never,
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: describedTx, open: true, onOpenChange: vi.fn() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setParty({ kind: 'new', name: 'Kavita' }));
    await act(async () => {
      resolveSuggest({ data: { counterparty: cp1 } });
    });

    await waitFor(() => expect(result.current.suggestedId).toBe('cp1'));
    expect(result.current.party).toEqual({ kind: 'new', name: 'Kavita' });
  });

  it('does not ask for a suggestion when the transaction has no description', async () => {
    mockGetByPath({});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange: vi.fn() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.amount).toBe('1200'));
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/counterparties/suggest', expect.anything());
    expect(result.current.party).toBeNull();
    expect(result.current.suggestedId).toBeNull();
  });

  it('cannot submit without a person, and a new person submits newCounterpartyName only', async () => {
    mockGetByPath({});
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l1' } } as never);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange: vi.fn() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.amount).toBe('1200'));
    expect(result.current.canSubmitNew).toBe(false);

    act(() => result.current.setParty({ kind: 'new', name: 'Kavita Rao' }));
    await waitFor(() => expect(result.current.canSubmitNew).toBe(true));

    act(() => result.current.handleSubmitNew());

    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    const [, postOpts] = vi.mocked(api.POST).mock.calls[0] as unknown as [string, { body: Record<string, unknown> }];
    const body = postOpts.body;
    expect(body.newCounterpartyName).toBe('Kavita Rao');
    expect(body.counterpartyId).toBeUndefined();
  });

  it('loads unlinked, direction-matching entries only once an existing person is chosen', async () => {
    const unlinkedLent: LendingResponse = {
      id: 'lend-unlinked',
      counterpartyId: 'cp1',
      counterpartyName: 'Rahul Sharma',
      amount: 300,
      direction: 'lent',
      entryDate: '2026-04-01',
      createdAt: '2026-04-01T00:00:00Z',
    };
    const linked: LendingResponse = {
      ...unlinkedLent,
      id: 'lend-linked',
      transaction: { id: 't-other', accountId: 'acc1', date: '2026-04-01' } as LendingResponse['transaction'],
    };
    const borrowed: LendingResponse = { ...unlinkedLent, id: 'lend-borrowed', direction: 'borrowed' };
    mockGetByPath({ '/api/v1/lendings': { content: [unlinkedLent, linked, borrowed] } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange: vi.fn() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setParty({ kind: 'new', name: 'Kavita' }));
    await waitFor(() => expect(result.current.party?.kind).toBe('new'));
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/lendings', expect.anything());
    expect(result.current.unlinkedEntries).toEqual([]);

    act(() => result.current.setParty({ kind: 'existing', counterparty: cp1 }));
    await waitFor(() => expect(result.current.unlinkedEntries).toEqual([unlinkedLent]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/lendings', {
      params: { query: { counterpartyId: 'cp1', page: 0, size: 50 } },
    });
  });
});
