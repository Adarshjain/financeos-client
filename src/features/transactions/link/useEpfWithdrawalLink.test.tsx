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
import type { Transaction } from '@/lib/transaction.types';

import { type EpfWithdrawalOption, useEpfWithdrawalLink } from './useEpfWithdrawalLink';

type Mock = ReturnType<typeof vi.fn>;

const txn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-02-24',
  amount: 40000,
  description: 'NEFT CR EPFO MUMBAI',
  source: 'manual',
  createdAt: '2026-02-24T00:00:00Z',
};

const option = (id: string, over: Omit<Partial<EpfWithdrawalOption>, 'entry'> & { entry?: Record<string, unknown> } = {}): EpfWithdrawalOption =>
  ({
    suggested: false,
    tdsGap: null,
    ...over,
    entry: {
      id,
      employerId: 'emp1',
      employerName: 'Northwind Labs',
      creditedOn: '2026-02-22',
      employeeAmount: 25000,
      employerAmount: 15000,
      withdrawalKind: 'PARTIAL',
      ...over.entry,
    },
  }) as EpfWithdrawalOption;

function mockServer(options: EpfWithdrawalOption[]) {
  (api.GET as Mock).mockImplementation(async (path: string) => {
    if (path === '/api/v1/epf/withdrawals') return { data: options };
    if (path === '/api/v1/epf/employers') return { data: [{ id: 'emp1', name: 'Northwind Labs' }, { id: 'emp2', name: 'Globex Retail', employeeBalance: 61800, employerBalance: 50800 }] };
    return { data: {} };
  });
}

function setup(transaction: Transaction | undefined = txn) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  const hook = renderHook(() => useEpfWithdrawalLink({ transaction, open: true, onOpenChange, onSuccess }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return { ...hook, onOpenChange, onSuccess };
}

describe('useEpfWithdrawalLink existing mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    (api.POST as Mock).mockResolvedValue({ data: { id: 'new1' } });
  });

  it('asks for the withdrawals of this transaction and preselects the suggested one, listed first', async () => {
    mockServer([option('s', { suggested: true }), option('o')]);
    const { result } = setup();
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/epf/withdrawals', { params: { query: { forTransactionId: 't1' } } });
    expect(result.current.options.map((o) => o.entry.id)).toEqual(['s', 'o']);
    expect(result.current.selectedId).toBe('s');
    expect(result.current.canSubmit).toBe(true);
  });

  it('does not preselect when nothing is suggested, and a pick replaces the suggestion', async () => {
    mockServer([option('a'), option('b', { suggested: true })]);
    const { result } = setup();
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    act(() => result.current.setSelectedId('a'));
    expect(result.current.selectedId).toBe('a');
  });

  it('cannot submit without a selection', async () => {
    mockServer([option('a')]);
    const { result } = setup();
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.selectedId).toBe('');
    act(() => result.current.handleSubmit());
    expect(toast.error).toHaveBeenCalledWith('Select a withdrawal to link');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('filters by employer or kind', async () => {
    mockServer([option('a'), option('g', { entry: { employerName: 'Globex Retail', withdrawalKind: 'FINAL_SETTLEMENT' } })]);
    const { result } = setup();
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    act(() => result.current.setSearch('final'));
    expect(result.current.options.map((o) => o.entry.id)).toEqual(['g']);
  });

  it('shows the TDS choice only with a gap, on by default, and sends recordTds', async () => {
    mockServer([option('g', { suggested: true, tdsGap: 11260 })]);
    const { result, onSuccess, onOpenChange } = setup();
    await waitFor(() => expect(result.current.selectedId).toBe('g'));
    expect(result.current.tdsGap).toBe(11260);
    expect(result.current.recordTds).toBe(true);
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: 'g' } },
      body: { transactionId: 't1', recordTds: true },
    });
    expect(toast.success).toHaveBeenCalledWith('EPF withdrawal linked');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sends recordTds false when the box is cleared, and has no gap without one', async () => {
    mockServer([option('g', { suggested: true, tdsGap: 500 }), option('n', { suggested: false })]);
    const { result } = setup();
    await waitFor(() => expect(result.current.selectedId).toBe('g'));
    act(() => result.current.setRecordTds(false));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect((api.PUT as Mock).mock.calls[0][1].body.recordTds).toBe(false);
    act(() => result.current.setSelectedId('n'));
    expect(result.current.tdsGap).toBeNull();
    expect(result.current.recordTds).toBe(false);
  });

  it('shows the server error and stays open when linking fails', async () => {
    mockServer([option('g', { suggested: true })]);
    (api.PUT as Mock).mockRejectedValue(new Error('Already linked'));
    const { result, onSuccess, onOpenChange } = setup();
    await waitFor(() => expect(result.current.selectedId).toBe('g'));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('does not fetch while closed', () => {
    mockServer([]);
    const queryClient = new QueryClient();
    renderHook(() => useEpfWithdrawalLink({ transaction: txn, open: false, onOpenChange: vi.fn() }), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    expect(api.GET).not.toHaveBeenCalled();
  });
});

describe('useEpfWithdrawalLink new mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServer([]);
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    (api.POST as Mock).mockResolvedValue({ data: { id: 'new1' } });
  });

  it('prefills the date and the amount from the credit and loads the employers', async () => {
    const { result } = setup();
    act(() => result.current.setMode('new'));
    await waitFor(() => expect(result.current.employers).toHaveLength(2));
    expect(result.current.creditedOn).toBe('2026-02-24');
    expect(result.current.employee).toBe('40000');
    expect(result.current.pension).toBe('40000');
    expect(result.current.canSubmit).toBe(false);
  });

  it('creates the withdrawal with its shares and TDS, then links it without recording TDS twice', async () => {
    const { result, onSuccess } = setup();
    act(() => result.current.setMode('new'));
    act(() => {
      result.current.setEmployerId('emp1');
      result.current.setEmployee('25000');
      result.current.setEmployer('15000');
      result.current.setTdsOn(true);
      result.current.setTds('500');
      result.current.setNote(' Medical advance ');
    });
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/epf/entries', {
      body: {
        type: 'WITHDRAWAL',
        withdrawalKind: 'PARTIAL',
        employerId: 'emp1',
        creditedOn: '2026-02-24',
        employeeAmount: 25000,
        employerAmount: 15000,
        pensionAmount: 0,
        tdsAmount: 500,
        note: 'Medical advance',
      },
    });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: 'new1' } },
      body: { transactionId: 't1', recordTds: false },
    });
    expect(toast.success).toHaveBeenCalledWith('EPF withdrawal recorded and linked');
  });

  it('shows what lands in the bank: the shares less TDS, with the shares kept as the gross', async () => {
    const { result } = setup();
    act(() => result.current.setMode('new'));
    expect(result.current.receivedCaption).toBe('Received in bank: ₹40,000.');
    act(() => result.current.setTds('11260'));
    expect(result.current.receivedCaption).toBe('Received in bank: ₹40,000.');
    act(() => result.current.setTdsOn(true));
    expect(result.current.employee).toBe('40000');
    expect(result.current.receivedCaption).toBe('Received in bank: ₹28,740.');
    act(() => result.current.setKind('PENSION'));
    act(() => result.current.setPension('28400'));
    act(() => result.current.setTds('0'));
    expect(result.current.receivedCaption).toBe('Received in bank: ₹28,400.');
    act(() => result.current.setTdsOn(false));
    expect(result.current.receivedCaption).toBe('Received in bank: ₹28,400.');
  });

  it('fills a final settlement from the employer balance, in either order of choosing', async () => {
    const { result } = setup();
    act(() => result.current.setMode('new'));
    await waitFor(() => expect(result.current.employers).toHaveLength(2));
    act(() => result.current.setKind('FINAL_SETTLEMENT'));
    act(() => result.current.setEmployerId('emp2'));
    expect(result.current.employee).toBe('61800');
    expect(result.current.employer).toBe('50800');
    expect(result.current.receivedCaption).toBe('Received in bank: ₹1,12,600.');
    act(() => result.current.setTds('11260'));
    act(() => result.current.setTdsOn(true));
    expect(result.current.receivedCaption).toBe('Received in bank: ₹1,01,340.');
  });

  it('does not touch the shares of a partial withdrawal when an employer is chosen', async () => {
    const { result } = setup();
    act(() => result.current.setMode('new'));
    await waitFor(() => expect(result.current.employers).toHaveLength(2));
    act(() => result.current.setEmployerId('emp2'));
    expect(result.current.employee).toBe('40000');
    expect(result.current.employer).toBe('');
  });

  it('sends no TDS when the box is unchecked, even if a figure was typed before', async () => {
    const { result, onSuccess } = setup();
    act(() => result.current.setMode('new'));
    act(() => {
      result.current.setEmployerId('emp1');
      result.current.setTdsOn(true);
      result.current.setTds('500');
    });
    act(() => result.current.setTdsOn(false));
    expect(result.current.tdsError).toBeUndefined();
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][1].body.tdsAmount).toBeNull();
  });

  it('a pension withdrawal has one amount and no shares', async () => {
    const { result, onSuccess } = setup();
    act(() => result.current.setMode('new'));
    act(() => {
      result.current.setKind('PENSION');
      result.current.setEmployerId('emp2');
      result.current.setPension('28400');
    });
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][1].body).toMatchObject({
      withdrawalKind: 'PENSION',
      employerId: 'emp2',
      pensionAmount: 28400,
      employeeAmount: 0,
      employerAmount: 0,
    });
  });

  it('needs an employer and a positive amount, and flags a bad amount', async () => {
    const { result } = setup();
    act(() => result.current.setMode('new'));
    act(() => result.current.setEmployee('25000'));
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setEmployerId('emp1'));
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.setEmployee('abc'));
    expect(result.current.employeeError).toBe('Enter an amount above ₹0.');
    expect(result.current.canSubmit).toBe(false);
    act(() => {
      result.current.setEmployee('0');
      result.current.setEmployer('0');
    });
    expect(result.current.canSubmit).toBe(false);
  });

  it('shows the error when creating fails and does not link', async () => {
    (api.POST as Mock).mockRejectedValue(new Error('Employer is settled'));
    const { result, onSuccess } = setup();
    act(() => result.current.setMode('new'));
    act(() => result.current.setEmployerId('emp1'));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(api.PUT).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('a failed link after a successful create is retried without creating a second withdrawal', async () => {
    (api.PUT as Mock).mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ data: {} });
    const { result, onSuccess } = setup();
    act(() => result.current.setMode('new'));
    act(() => result.current.setEmployerId('emp1'));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.PUT).toHaveBeenCalledTimes(2);
  });
});
