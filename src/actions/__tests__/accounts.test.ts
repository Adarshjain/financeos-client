/* eslint-disable simple-import-sort/imports */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRevalidatePath } from '@/test/next-mocks';
import { closeAccount, createAccount, deleteAccount, getCardCycleSummary, reopenAccount, updateAccount } from '@/actions/accounts';
import { accountsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  accountsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
    getCardCycleSummary: vi.fn(),
  },
}));

describe('accounts server actions', () => {
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

  it('closeAccount calls accountsApi.close and revalidates paths', async () => {
    vi.mocked(accountsApi.close).mockResolvedValue({ id: 'acc1', closedOn: '2026-08-01' } as any);

    const res = await closeAccount('acc1', { closedOn: '2026-08-01' });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/rewards');
  });

  it('reopenAccount calls accountsApi.reopen and revalidates paths', async () => {
    vi.mocked(accountsApi.reopen).mockResolvedValue({ id: 'acc1', closedOn: null } as any);

    const res = await reopenAccount('acc1');
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
