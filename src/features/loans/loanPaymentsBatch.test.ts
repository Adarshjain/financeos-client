import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

const api = vi.hoisted(() => ({ POST: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));

import { paymentItemFor, postLoanPaymentsBatch } from './loanPaymentsBatch';

beforeEach(() => {
  api.POST.mockReset();
});

describe('paymentItemFor', () => {
  it('pays the installment that day, for that amount, with that transaction', () => {
    expect(paymentItemFor(14, { id: 't1', date: '2026-10-05', amount: -36603 } as Transaction)).toEqual({
      installmentSeq: 14,
      paymentDate: '2026-10-05',
      amount: 36603,
      transactionId: 't1',
    });
    expect(paymentItemFor(1, { id: 't2', date: '2026-10-06', amount: 500 } as Transaction).amount).toBe(500);
  });
});

describe('postLoanPaymentsBatch', () => {
  it('posts the items to the loan and counts them', async () => {
    api.POST.mockResolvedValue({ data: {} });
    const items = [{ installmentSeq: 1, paymentDate: '2026-10-05', amount: 1, transactionId: 't' }];
    await expect(postLoanPaymentsBatch('l1', { items })).resolves.toEqual({ created: 1 });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments/batch', { params: { path: { id: 'l1' } }, body: { items } });
  });

  it('rejects when the request fails', async () => {
    api.POST.mockRejectedValue(new Error('nope'));
    await expect(postLoanPaymentsBatch('l1', { items: [] })).rejects.toThrow('nope');
  });
});
