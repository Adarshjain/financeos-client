/* eslint-disable simple-import-sort/imports */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRevalidatePath } from '@/test/next-mocks';
import {
  addAddonCardholder,
  addCard,
  closeCard,
  closeCardholder,
  deleteCard,
  deleteCardholder,
  listCardholders,
  reopenCardholder,
  replaceCard,
  updateCardholder,
} from '@/actions/cardholders';
import { cardholdersApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  cardholdersApi: {
    listByAccount: vi.fn(),
    addAddon: vi.fn(),
    update: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
    delete: vi.fn(),
    addCard: vi.fn(),
    replaceCard: vi.fn(),
    closeCard: vi.fn(),
    deleteCard: vi.fn(),
  },
}));

describe('cardholders server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listCardholders calls cardholdersApi.listByAccount', async () => {
    vi.mocked(cardholdersApi.listByAccount).mockResolvedValue([{ id: 'ch1', personName: 'Primary' }] as any);

    const res = await listCardholders('acc1');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toHaveLength(1);
    }
  });

  it('addAddonCardholder calls cardholdersApi.addAddon and revalidates paths', async () => {
    vi.mocked(cardholdersApi.addAddon).mockResolvedValue({ id: 'ch2', personName: 'Jane' } as any);

    const res = await addAddonCardholder('acc1', { personName: 'Jane', last4: '1234' } as any);
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('updateCardholder calls cardholdersApi.update and revalidates paths', async () => {
    vi.mocked(cardholdersApi.update).mockResolvedValue({ id: 'ch2', personName: 'Jane Updated' } as any);

    const res = await updateCardholder('acc1', 'ch2', { personName: 'Jane Updated' } as any);
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('closeCardholder calls cardholdersApi.close and revalidates paths', async () => {
    vi.mocked(cardholdersApi.close).mockResolvedValue({ id: 'ch2', closedOn: '2026-08-01' } as any);

    const res = await closeCardholder('acc1', 'ch2', { closedOn: '2026-08-01' });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('reopenCardholder calls cardholdersApi.reopen and revalidates paths', async () => {
    vi.mocked(cardholdersApi.reopen).mockResolvedValue({ id: 'ch2', closedOn: null } as any);

    const res = await reopenCardholder('acc1', 'ch2');
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('deleteCardholder calls cardholdersApi.delete and revalidates paths', async () => {
    vi.mocked(cardholdersApi.delete).mockResolvedValue(undefined);

    const res = await deleteCardholder('acc1', 'ch2');
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('addCard calls cardholdersApi.addCard and revalidates paths', async () => {
    vi.mocked(cardholdersApi.addCard).mockResolvedValue({ id: 'ch1' } as any);

    const res = await addCard('acc1', 'ch1', { last4: '5555', issuedOn: '2026-08-15' });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('replaceCard calls cardholdersApi.replaceCard and revalidates paths', async () => {
    vi.mocked(cardholdersApi.replaceCard).mockResolvedValue({ id: 'ch1' } as any);

    const res = await replaceCard('acc1', 'ch1', 'card1', { newLast4: '9999', issuedOn: '2026-08-15' });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transactions');
  });

  it('closeCard calls cardholdersApi.closeCard and revalidates paths', async () => {
    vi.mocked(cardholdersApi.closeCard).mockResolvedValue({ id: 'ch1' } as any);

    const res = await closeCard('acc1', 'ch1', 'card1', { closedOn: '2026-08-15' });
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });

  it('deleteCard calls cardholdersApi.deleteCard and revalidates paths', async () => {
    vi.mocked(cardholdersApi.deleteCard).mockResolvedValue(undefined);

    const res = await deleteCard('acc1', 'ch1', 'card1');
    expect(res.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/accounts');
  });
});
