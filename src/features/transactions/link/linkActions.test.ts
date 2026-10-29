import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  attachLendingTransaction,
  createDividend,
  createEpfWithdrawal,
  createLending,
  linkDividend,
  linkEpfWithdrawal,
  loadActiveLoans,
  loadDividendPages,
  loadEpfEmployers,
  loadEpfWithdrawals,
  loadLoanInstallments,
  loadPersonLendings,
  payLoanInstallment,
} from './linkActions';

beforeEach(() => vi.clearAllMocks());

describe('EPF link actions', () => {
  it('lists the withdrawals offered for a credit, empty when none come back', async () => {
    mocks.GET.mockResolvedValue({ data: [{ entry: { id: 'e1' } }] });
    expect(await loadEpfWithdrawals('t1')).toEqual({ success: true, data: [{ entry: { id: 'e1' } }] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/epf/withdrawals', { params: { query: { forTransactionId: 't1' } } });
    mocks.GET.mockResolvedValue({ data: undefined });
    expect(await loadEpfWithdrawals('t1')).toEqual({ success: true, data: [] });
  });

  it('lists the employers', async () => {
    mocks.GET.mockResolvedValue({ data: [{ id: 'emp1' }] });
    expect(await loadEpfEmployers()).toEqual({ success: true, data: [{ id: 'emp1' }] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/epf/employers');
  });

  it('links a withdrawal and creates one, returning only its id', async () => {
    mocks.PUT.mockResolvedValue({ data: {} });
    await linkEpfWithdrawal('e1', 't1', true);
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: 'e1' } }, body: { transactionId: 't1', recordTds: true } });
    mocks.POST.mockResolvedValue({ data: { id: 'e9', other: 1 } });
    const body = { type: 'WITHDRAWAL' } as never;
    expect(await createEpfWithdrawal(body)).toEqual({ success: true, data: { id: 'e9' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/epf/entries', { body });
  });
});

describe('dividend link actions', () => {
  it('loads one page per receipt state', async () => {
    mocks.GET.mockImplementation(async (_p: string, o: { params: { query: { receipt: string } } }) => ({ data: { content: [{ id: o.params.query.receipt }] } }));
    expect(await loadDividendPages(['awaiting', 'overdue'])).toEqual({ success: true, data: [[{ id: 'awaiting' }], [{ id: 'overdue' }]] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/investments/dividends', { params: { query: { receipt: 'awaiting', page: 0, size: 50 } } });
  });

  it('links a dividend and creates one, returning only its id', async () => {
    mocks.PUT.mockResolvedValue({ data: {} });
    await linkDividend('d1', 't1', false);
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: 'd1' } }, body: { transactionId: 't1', updateTds: false } });
    mocks.POST.mockResolvedValue({ data: { id: 'd9', other: 1 } });
    const body = { amount: 10 } as never;
    expect(await createDividend(body)).toEqual({ success: true, data: { id: 'd9' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/investments/dividends', { body });
  });
});

describe('lending link actions', () => {
  it("lists a person's entries", async () => {
    mocks.GET.mockResolvedValue({ data: { content: [{ id: 'l1' }] } });
    expect(await loadPersonLendings('p1')).toEqual({ success: true, data: [{ id: 'l1' }] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/lendings', { params: { query: { counterpartyId: 'p1', page: 0, size: 50 } } });
  });

  it('records a lending and attaches a transaction to one', async () => {
    mocks.POST.mockResolvedValue({ data: { id: 'l1' } });
    const body = { amount: 5 } as never;
    expect(await createLending(body)).toEqual({ success: true, data: { id: 'l1' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/lendings', { body });
    mocks.PUT.mockResolvedValue({ data: {} });
    await attachLendingTransaction('l1', 't1');
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', { params: { path: { id: 'l1' } }, body: { transactionId: 't1' } });
  });
});

describe('loan payment link actions', () => {
  it('lists the active loans', async () => {
    mocks.GET.mockResolvedValue({ data: { content: [{ id: 'ln1' }] } });
    expect(await loadActiveLoans()).toEqual({ success: true, data: [{ id: 'ln1' }] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/loans', { params: { query: { status: 'active', page: 0, size: 100 } } });
  });

  it('flattens the schedule whatever its grouping', async () => {
    mocks.GET.mockResolvedValue({ data: { upcoming: [{ seq: 1 }], overdue: [{ seq: 2 }] } });
    expect(await loadLoanInstallments('ln1')).toEqual({ success: true, data: [{ seq: 1 }, { seq: 2 }] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/loans/{id}/schedule', { params: { path: { id: 'ln1' } } });
    mocks.GET.mockResolvedValue({ data: undefined });
    expect(await loadLoanInstallments('ln1')).toEqual({ success: true, data: [] });
  });

  it('pays an installment and reports a failure with the fallback message', async () => {
    mocks.POST.mockResolvedValue({ data: { installmentSeq: 3 } });
    const body = { paymentDate: '2026-07-10', amount: 10, installmentSeq: 3, transactionId: 't1' };
    expect(await payLoanInstallment('ln1', body)).toEqual({ success: true, data: { installmentSeq: 3 } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', { params: { path: { id: 'ln1' } }, body });
    mocks.POST.mockRejectedValue(new Error('down'));
    expect(await payLoanInstallment('ln1', body)).toMatchObject({ success: false, error: { message: "Couldn't settle the installment. Try again." } });
  });
});
