/* eslint-disable simple-import-sort/imports */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRevalidatePath } from '@/test/next-mocks';
import {
  closeAccountCard,
  createAccountCard,
  deleteAccountCard,
  listAccountCards,
  replaceAccountCard,
  updateAccountCard,
} from '@/actions/accountCards';
import { accountCardsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  accountCardsApi: {
    listByAccount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    replace: vi.fn(),
    close: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('accountCards server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listAccountCards calls accountCardsApi.listByAccount', async () => {
    vi.mocked(accountCardsApi.listByAccount).mockResolvedValue([{ id: 'c1', holderName: 'Primary' }] as any);

    const res = await listAccountCards('acc1');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toHaveLength(1);
    }
  });

  it('createAccountCard calls accountCardsApi.create and revalidates paths', async () => {
    vi.mocked(accountCardsApi.create).mockResolvedValue({ id: 'c2', holderName: 'Add-on' } as any);

    const res = await createAccountCard('acc1', { last4: '1234', holderName: 'Add-on' } as any);
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('updateAccountCard calls accountCardsApi.update and revalidates paths', async () => {
    vi.mocked(accountCardsApi.update).mockResolvedValue({ id: 'c2', holderName: 'Spouse' } as any);

    const res = await updateAccountCard('acc1', 'c2', { holderName: 'Spouse' } as any);
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('replaceAccountCard calls accountCardsApi.replace and revalidates paths', async () => {
    vi.mocked(accountCardsApi.replace).mockResolvedValue({ id: 'c1', last4: '9999' } as any);

    const res = await replaceAccountCard('acc1', 'c1', {
      newLast4: '9999',
      issuedOn: '2026-08-15',
    });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions');
  });

  it('closeAccountCard calls accountCardsApi.close and revalidates paths', async () => {
    vi.mocked(accountCardsApi.close).mockResolvedValue({ id: 'c2', closedOn: '2026-08-01' } as any);

    const res = await closeAccountCard('acc1', 'c2', { closedOn: '2026-08-01' });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('deleteAccountCard calls accountCardsApi.delete and revalidates paths', async () => {
    vi.mocked(accountCardsApi.delete).mockResolvedValue(undefined);

    const res = await deleteAccountCard('acc1', 'c2');
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });
});
