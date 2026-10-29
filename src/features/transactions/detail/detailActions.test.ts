import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  addTransactionLink,
  attachDividendTransaction,
  attachEpfWithdrawalTransaction,
  detachDividendTransaction,
  detachEpfWithdrawalTransaction,
  loadTransaction,
  loadTransactionLinks,
  removeLoanPayment,
  removeTransaction,
  removeTransactionLink,
} from './detailActions';

beforeEach(() => {
  vi.clearAllMocks();
  for (const m of Object.values(mocks)) m.mockResolvedValue({ data: undefined });
});

describe('detail actions', () => {
  it('loads one transaction', async () => {
    mocks.GET.mockResolvedValue({ data: { id: 't1' } });
    expect(await loadTransaction('t1')).toEqual({ success: true, data: { id: 't1' } });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/transactions/{id}', { params: { path: { id: 't1' } } });
  });

  it('deletes a transaction', async () => {
    expect((await removeTransaction('t1')).success).toBe(true);
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/transactions/{id}', { params: { path: { id: 't1' } } });
  });

  it('lists links, empty when none come back', async () => {
    mocks.GET.mockResolvedValue({ data: [{ id: 'l1' }] });
    expect(await loadTransactionLinks('t1')).toEqual({ success: true, data: [{ id: 'l1' }] });
    expect(mocks.GET).toHaveBeenCalledWith('/api/v1/transaction-links', { params: { query: { transactionId: 't1' } } });
    mocks.GET.mockResolvedValue({ data: undefined });
    expect(await loadTransactionLinks('t1')).toEqual({ success: true, data: [] });
  });

  it('creates and deletes a link', async () => {
    mocks.POST.mockResolvedValue({ data: { id: 'l1' } });
    const body = { type: 'REFUND' } as never;
    expect(await addTransactionLink(body)).toEqual({ success: true, data: { id: 'l1' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transaction-links', { body });
    await removeTransactionLink('l1');
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/transaction-links/{id}', { params: { path: { id: 'l1' } } });
  });

  it('deletes a loan payment', async () => {
    await removeLoanPayment('ln1', 'p1');
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/loans/{id}/payments/{paymentId}', { params: { path: { id: 'ln1', paymentId: 'p1' } } });
  });

  it('detaches and attaches a dividend credit', async () => {
    await detachDividendTransaction('d1');
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: 'd1' } } });
    await attachDividendTransaction('d1', 't1', true);
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'd1' } },
      body: { transactionId: 't1', updateTds: true },
    });
  });

  it('detaches and attaches an EPF withdrawal credit without recording TDS again', async () => {
    await detachEpfWithdrawalTransaction('e1');
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: 'e1' } } });
    await attachEpfWithdrawalTransaction('e1', 't1');
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: 'e1' } },
      body: { transactionId: 't1', recordTds: false },
    });
  });

  it('reports a failure with the fallback message', async () => {
    mocks.DELETE.mockRejectedValue(new Error('down'));
    expect(await removeTransaction('t1')).toMatchObject({ success: false, error: { message: "Couldn't delete the transaction. Try again." } });
  });
});
