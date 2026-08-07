/* eslint-disable simple-import-sort/imports */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRevalidatePath } from '@/test/next-mocks';
import { createAccount, deleteAccount, getCardCycleSummary, updateAccount } from '@/actions/accounts';
import { accountsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  accountsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getCardCycleSummary: vi.fn(),
  },
}));

describe('accounts server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createAccount calls accountsApi.create and revalidates path', async () => {
    vi.mocked(accountsApi.create).mockResolvedValue({ id: 'acc1', name: 'HDFC' } as any);

    const res = await createAccount({ name: 'HDFC', type: 'bank_account' } as any);

    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('updateAccount calls accountsApi.update and revalidates path', async () => {
    vi.mocked(accountsApi.update).mockResolvedValue({ id: 'acc1', name: 'HDFC Updated' } as any);

    const res = await updateAccount('acc1', { name: 'HDFC Updated', type: 'bank_account' } as any);
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('deleteAccount calls accountsApi.delete and revalidates path', async () => {
    vi.mocked(accountsApi.delete).mockResolvedValue(undefined);

    const res = await deleteAccount('acc1');
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('getCardCycleSummary calls API wrapper', async () => {
    vi.mocked(accountsApi.getCardCycleSummary).mockResolvedValue({ totalAmountDue: 100 } as any);

    expect((await getCardCycleSummary('acc1')).success).toBe(true);
  });
});
