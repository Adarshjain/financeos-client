/* eslint-disable simple-import-sort/imports */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRevalidatePath } from '@/test/next-mocks';
import { batchDeleteTransactions, batchReviewTransactions, createTransaction, deleteTransaction, searchTransactions, updateTransaction } from '@/actions/transactions';
import { transactionsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  transactionsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    batchReview: vi.fn(),
    batchDelete: vi.fn(),
  },
}));

describe('transactions server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createTransaction calls API and revalidates views', async () => {
    vi.mocked(transactionsApi.create).mockResolvedValue({ id: 't1' } as any);

    const res = await createTransaction({ accountId: 'a1', amount: 100 } as any);
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions/review');
  });

  it('updateTransaction calls API and revalidates views', async () => {
    vi.mocked(transactionsApi.update).mockResolvedValue({ id: 't1' } as any);

    const res = await updateTransaction('t1', { amount: 200 } as any);
    expect(res.success).toBe(true);
  });

  it('deleteTransaction calls API and revalidates views', async () => {
    vi.mocked(transactionsApi.delete).mockResolvedValue(undefined);

    const res = await deleteTransaction('t1');
    expect(res.success).toBe(true);
  });

  it('searchTransactions calls transactionsApi.search', async () => {
    vi.mocked(transactionsApi.search).mockResolvedValue({ content: [] } as any);

    const res = await searchTransactions({ filters: [] }, 0, 50, 'date,desc');
    expect(res.success).toBe(true);
  });

  it('batchReviewTransactions and batchDeleteTransactions call batch APIs and revalidate', async () => {
    vi.mocked(transactionsApi.batchReview).mockResolvedValue({ succeededIds: ['t1'], skippedIds: [], failures: [] });
    vi.mocked(transactionsApi.batchDelete).mockResolvedValue({ succeededIds: ['t1'], failures: [] });

    const reviewRes = await batchReviewTransactions(['t1'], 'MANUALLY_REVIEWED', ['UNRECONCILED']);
    expect(reviewRes.success).toBe(true);

    const deleteRes = await batchDeleteTransactions(['t1']);
    expect(deleteRes.success).toBe(true);
  });
});
