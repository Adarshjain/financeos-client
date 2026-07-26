import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRevalidatePath } from '@/test/next-mocks';

import { createTransactionLink, deleteTransactionLink, getTransactionLinks } from '@/actions/transaction-links';
import { transactionLinksApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  transactionLinksApi: {
    create: vi.fn(),
    delete: vi.fn(),
    getByTransactionId: vi.fn(),
  },
}));

describe('transaction-links server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createTransactionLink sanitizes request, calls API, and revalidates views', async () => {
    vi.mocked(transactionLinksApi.create).mockResolvedValue({ id: 'tl1' } as any);

    const res = await createTransactionLink({
      type: 'TRANSFER',
      note: '   test note   ',
      members: [
        { transactionId: 't1', isAnchor: true },
        { transactionId: 't2', isAnchor: false },
      ],
    });

    expect(res.success).toBe(true);
    expect(transactionLinksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'test note' }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions/review');
  });

  it('deleteTransactionLink calls API and revalidates views', async () => {
    vi.mocked(transactionLinksApi.delete).mockResolvedValue(undefined);

    const res = await deleteTransactionLink('tl1');
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions');
  });

  it('getTransactionLinks calls API', async () => {
    vi.mocked(transactionLinksApi.getByTransactionId).mockResolvedValue([{ id: 'tl1' }] as any);

    const res = await getTransactionLinks('t1');
    expect(res.success).toBe(true);
  });
});
