import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { type DividendRow } from '../dividendLinkHelpers';
import { useDividendLink } from '../useDividendLink';

type Mock = ReturnType<typeof vi.fn>;

const txn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-10',
  amount: 900,
  description: 'ACH credit INFY',
  source: 'manual',
  createdAt: '2026-07-10T00:00:00Z',
};

const div = (o: Partial<DividendRow> & { id: string }): DividendRow =>
  ({
    symbol: 'INFY',
    instrumentName: 'Infosys',
    brokerName: 'Zerodha',
    amount: 1000,
    payDate: '2026-07-01',
    receiptStatus: 'awaiting',
    ...o,
  }) as DividendRow;

function mockReceipts(byReceipt: Record<string, DividendRow[]>) {
  (api.GET as Mock).mockImplementation((_path: string, opts: { params: { query: { receipt: string } } }) =>
    Promise.resolve({ data: { content: byReceipt[opts.params.query.receipt] ?? [] } }),
  );
}

function setup(transaction: Transaction | undefined = txn) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  const hook = renderHook(
    () => useDividendLink({ transaction, open: true, onOpenChange, onSuccess }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    },
  );
  return { ...hook, invalidate, onOpenChange, onSuccess, queryClient };
}

describe('useDividendLink existing mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches awaiting/overdue/unverifiable (3 x size 50), merges and sorts by payDate desc', async () => {
    mockReceipts({
      awaiting: [div({ id: 'a', payDate: '2026-06-01' })],
      overdue: [div({ id: 'o', payDate: '2026-07-05' })],
      unverifiable: [div({ id: 'u', payDate: '2026-03-01' })],
    });
    const { result, queryClient } = setup();
    await waitFor(() => expect(result.current.dividends).toHaveLength(3));

    expect(result.current.dividends.map((d) => d.id)).toEqual(['o', 'a', 'u']);
    for (const receipt of ['awaiting', 'overdue', 'unverifiable']) {
      expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/dividends', {
        params: { query: { receipt, page: 0, size: 50 } },
      });
    }
    expect(queryClient.getQueryData(keys.investments.dividends({ receipt: 'unresolved', size: 150 }))).toBeDefined();
  });

  it('does not fetch while closed', () => {
    mockReceipts({});
    const queryClient = new QueryClient();
    renderHook(() => useDividendLink({ transaction: txn, open: false, onOpenChange: vi.fn() }), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('filters by search text', async () => {
    mockReceipts({
      awaiting: [div({ id: 'a' }), div({ id: 'b', symbol: 'TCS', instrumentName: 'Tata', brokerName: 'Groww' })],
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.dividends).toHaveLength(2));
    act(() => result.current.setSearch('groww'));
    expect(result.current.dividends.map((d) => d.id)).toEqual(['b']);
  });

  it('preselects an exact gross match, else the 0.9 rule, else nearest pay date', async () => {
    mockReceipts({ awaiting: [div({ id: 'far', amount: 5000 }), div({ id: 'exact', amount: 900 })] });
    const first = setup();
    await waitFor(() => expect(first.result.current.selectedId).toBe('exact'));

    mockReceipts({ awaiting: [div({ id: 'far', amount: 5000 }), div({ id: 'ninety', amount: 1000 })] });
    const second = setup();
    await waitFor(() => expect(second.result.current.selectedId).toBe('ninety'));

    mockReceipts({
      awaiting: [
        div({ id: 'old', amount: 5000, payDate: '2026-01-01' }),
        div({ id: 'near', amount: 7000, payDate: '2026-07-09' }),
      ],
    });
    const third = setup();
    await waitFor(() => expect(third.result.current.selectedId).toBe('near'));
  });

  it('an explicit pick overrides the preselection', async () => {
    mockReceipts({ awaiting: [div({ id: 'exact', amount: 900 }), div({ id: 'other', amount: 4000 })] });
    const { result } = setup();
    await waitFor(() => expect(result.current.selectedId).toBe('exact'));
    act(() => result.current.setSelectedId('other'));
    expect(result.current.selectedId).toBe('other');
  });

  it('offers the TDS gap (default checked) only when no TDS, credit < gross and gap <= 25%', async () => {
    mockReceipts({ awaiting: [div({ id: 'a', amount: 1000 })] });
    const { result } = setup();
    await waitFor(() => expect(result.current.selectedId).toBe('a'));
    expect(result.current.tdsGap).toBe(100);
    expect(result.current.recordTds).toBe(true);
    act(() => result.current.setRecordTds(false));
    expect(result.current.recordTds).toBe(false);
  });

  it.each([
    ['TDS already recorded', { amount: 1000, tds: 100 }, 900],
    ['gap above 25%', { amount: 2000 }, 900],
    ['credit equals gross', { amount: 900 }, 900],
  ])('no TDS gap when %s', async (_label, over, amount) => {
    mockReceipts({ awaiting: [div({ id: 'a', ...over })] });
    const { result } = setup({ ...txn, amount });
    await waitFor(() => expect(result.current.selectedId).toBe('a'));
    expect(result.current.tdsGap).toBeNull();
    expect(result.current.recordTds).toBe(false);
  });

  it('cannot submit with nothing selected', async () => {
    mockReceipts({});
    const { result } = setup();
    await waitFor(() => expect(result.current.loadingDividends).toBe(false));
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.handleSubmit());
    expect(toast.error).toHaveBeenCalledWith('Select a dividend to link');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('submits PUT with updateTds=true, toasts, invalidates and closes', async () => {
    mockReceipts({ awaiting: [div({ id: 'a', amount: 1000 })] });
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    const { result, invalidate, onOpenChange, onSuccess } = setup();
    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    act(() => result.current.handleSubmit());

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'a' } },
      body: { transactionId: 't1', updateTds: true },
    });
    expect(toast.success).toHaveBeenCalledWith('Dividend linked');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.investments.all });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sends updateTds=false when the checkbox is unticked', async () => {
    mockReceipts({ awaiting: [div({ id: 'a', amount: 1000 })] });
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    const { result, onSuccess } = setup();
    await waitFor(() => expect(result.current.canSubmit).toBe(true));
    act(() => result.current.setRecordTds(false));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith(
      '/api/v1/investments/dividends/{id}/transaction',
      expect.objectContaining({ body: { transactionId: 't1', updateTds: false } }),
    );
  });

  it('keeps the dialog open and shows an error toast when linking fails', async () => {
    mockReceipts({ awaiting: [div({ id: 'a' })] });
    (api.PUT as Mock).mockRejectedValue(new Error('nope'));
    const { result, onOpenChange, onSuccess } = setup();
    await waitFor(() => expect(result.current.canSubmit).toBe(true));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('useDividendLink new mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReceipts({});
  });

  async function setupNew() {
    const s = setup();
    await waitFor(() => expect(s.result.current.loadingDividends).toBe(false));
    act(() => s.result.current.setMode('new'));
    return s;
  }

  it('defaults amount to |txn.amount|, pay date to txn.date, type to dividend', async () => {
    const { result } = await setupNew();
    expect(result.current.amount).toBe('900');
    expect(result.current.payDate).toBe('2026-07-10');
    expect(result.current.type).toBe('dividend');
    expect(result.current.canSubmit).toBe(false);
  });

  it('defaults the amount to the absolute value for a negative transaction', async () => {
    const { result } = setup({ ...txn, amount: -250 });
    await waitFor(() => expect(result.current.amount).toBe('250'));
  });

  it('validates the holding first', async () => {
    const { result } = await setupNew();
    act(() => result.current.handleSubmit());
    expect(toast.error).toHaveBeenCalledWith('Please select a held instrument.');
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('validates the amount', async () => {
    const { result } = await setupNew();
    act(() => result.current.setHolding('b1|i1'));
    act(() => result.current.setAmount('abc'));
    act(() => result.current.handleSubmit());
    expect(toast.error).toHaveBeenCalledWith('Please enter a valid amount.');
    act(() => result.current.setAmount('0'));
    act(() => result.current.handleSubmit());
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('creates the dividend then links it with updateTds=false', async () => {
    (api.POST as Mock).mockResolvedValue({ data: { id: 'new-1' } });
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    const { result, onSuccess, onOpenChange } = await setupNew();
    act(() => {
      result.current.setHolding('b1|i1');
      result.current.setType('interest');
      result.current.setAmount('1000');
      result.current.setExDate('2026-06-20');
      result.current.setTds('100');
      result.current.setNotes('  final  ');
    });
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.handleSubmit());

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/dividends', {
      body: {
        brokerAccountId: 'b1',
        instrumentId: 'i1',
        type: 'interest',
        amount: 1000,
        tds: 100,
        exDate: '2026-06-20',
        payDate: '2026-07-10',
        notes: 'final',
      },
    });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'new-1' } },
      body: { transactionId: 't1', updateTds: false },
    });
    expect(toast.success).toHaveBeenCalledWith('Dividend recorded and linked');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('omits empty optional fields', async () => {
    (api.POST as Mock).mockResolvedValue({ data: { id: 'new-1' } });
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    const { result, onSuccess } = await setupNew();
    act(() => result.current.setHolding('b1|i1'));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][1].body).toEqual({
      brokerAccountId: 'b1',
      instrumentId: 'i1',
      type: 'dividend',
      amount: 900,
      tds: undefined,
      exDate: undefined,
      payDate: '2026-07-10',
      notes: undefined,
    });
  });

  it('shows an error toast and does not link when creation fails', async () => {
    (api.POST as Mock).mockRejectedValue(new Error('bad'));
    const { result, onSuccess } = await setupNew();
    act(() => result.current.setHolding('b1|i1'));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(api.PUT).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
