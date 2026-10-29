import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  batchDeleteTransactions,
  batchReviewTransactions,
  categorizeDescription,
  createTransaction,
  mergeTransactions,
  searchPickerTransactions,
  undoApproveTransactions,
  updateTransaction,
} from './actions';

beforeEach(() => vi.clearAllMocks());

describe('transaction actions', () => {
  it('searches one page for the picker', async () => {
    mocks.POST.mockResolvedValue({ data: { content: [{ id: 't1' }], totalPages: 1, totalElements: 1 } });
    const filters = [{ field: 'type', operator: 'is', value: 'DEBIT' }] as never;
    const result = await searchPickerTransactions(filters, 'rent', 0, 10);
    expect(result).toEqual({ success: true, data: { content: [{ id: 't1' }], totalPages: 1, totalElements: 1 } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transactions/search', { body: { filters, search: 'rent' }, params: { query: { page: 0, size: 10 } } });
  });

  it('creates and updates a transaction', async () => {
    mocks.POST.mockResolvedValue({ data: { id: 't1' } });
    mocks.PUT.mockResolvedValue({ data: { id: 't1' } });
    const body = { description: 'Rent' } as never;
    expect(await createTransaction(body)).toEqual({ success: true, data: { id: 't1' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transactions', { body });
    await updateTransaction('t1', body);
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/transactions/{id}', { params: { path: { id: 't1' } }, body });
  });

  it('suggests categories, and returns null when there is no answer', async () => {
    mocks.POST.mockResolvedValue({ data: { categories: [], mcc: '5411' } });
    expect(await categorizeDescription('Big Bazaar')).toEqual({ success: true, data: { categories: [], mcc: '5411' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/categorize', { body: { description: 'Big Bazaar' } });
    mocks.POST.mockResolvedValue({ data: undefined });
    expect(await categorizeDescription('Big Bazaar')).toEqual({ success: true, data: null });
  });

  it('batch deletes, and fails when the server sends nothing back', async () => {
    mocks.POST.mockResolvedValue({ data: { succeededIds: ['t1'], failures: [] } });
    expect(await batchDeleteTransactions(['t1'])).toEqual({ success: true, data: { succeededIds: ['t1'], failures: [] } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-delete', { body: { transactionIds: ['t1'] } });
    mocks.POST.mockResolvedValue({ data: undefined });
    expect((await batchDeleteTransactions(['t1'])).success).toBe(false);
  });

  it('merges two transactions', async () => {
    mocks.POST.mockResolvedValue({ data: { keptId: 'a', remainingReasons: [] } });
    expect((await mergeTransactions('a', 'b')).success).toBe(true);
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transactions/merge', { body: { keepId: 'a', deleteId: 'b' } });
    mocks.POST.mockResolvedValue({ data: undefined });
    expect((await mergeTransactions('a', 'b')).success).toBe(false);
  });

  it('batch reviews', async () => {
    mocks.POST.mockResolvedValue({ data: { succeededIds: ['t1'], skippedIds: [], failures: [] } });
    const body = { transactionIds: ['t1'], reviewType: 'MANUALLY_REVIEWED', reviewReasons: [] } as never;
    expect((await batchReviewTransactions(body)).success).toBe(true);
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', { body });
    mocks.POST.mockResolvedValue({ data: undefined });
    expect((await batchReviewTransactions(body)).success).toBe(false);
  });

  it('undoes an approve, and fails when the server sends nothing back', async () => {
    mocks.POST.mockResolvedValue({ data: { restored: 1 } });
    const body = { approved: [], rules: [] } as never;
    expect((await undoApproveTransactions(body)).success).toBe(true);
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/transactions/undo-approve', { body });
    mocks.POST.mockResolvedValue({ data: undefined });
    expect(await undoApproveTransactions(body)).toMatchObject({ success: false, error: { message: "Couldn't undo. Try again." } });
  });
});
