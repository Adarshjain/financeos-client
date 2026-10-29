import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/apiClient', async (orig) => ({ ...(await orig<typeof import('@/lib/apiClient')>()), epfApi: {} }));

import {
  createEpfEmployer,
  createEpfEntry,
  deleteEpfEntry,
  dismissEpfSuggestion,
  linkEpfEntryCredit,
  unlinkEpfEntryCredit,
  updateEpfEmployer,
  updateEpfEntry,
} from './epfActions';

beforeEach(() => vi.resetAllMocks());

describe('epfActions writes', () => {
  it('adds, changes and deletes an entry', async () => {
    api.POST.mockResolvedValue({ data: { id: 'e1' } });
    expect(await createEpfEntry({ month: '2026-10' } as never)).toEqual({ success: true, data: { id: 'e1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/epf/entries', { body: { month: '2026-10' } });
    api.PUT.mockResolvedValue({ data: { id: 'e1' } });
    await updateEpfEntry('e1', { month: '2026-11' } as never);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}', { params: { path: { id: 'e1' } }, body: { month: '2026-11' } });
    api.DELETE.mockResolvedValue({});
    await deleteEpfEntry('e1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/epf/entries/{id}', { params: { path: { id: 'e1' } } });
  });

  it('links, unlinks and dismisses the bank credit', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'e1' } });
    await linkEpfEntryCredit('e1', 't1', true);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: 'e1' } }, body: { transactionId: 't1', recordTds: true } });
    api.DELETE.mockResolvedValue({});
    await unlinkEpfEntryCredit('e1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: 'e1' } } });
    api.POST.mockResolvedValue({});
    await dismissEpfSuggestion('e1', 't1');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/suggestion/dismiss', { params: { path: { id: 'e1' } }, body: { transactionId: 't1' } });
  });

  it('adds and changes an employer', async () => {
    api.POST.mockResolvedValue({ data: { id: 'm1' } });
    expect(await createEpfEmployer({ name: 'Acme' })).toEqual({ success: true, data: { id: 'm1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/epf/employers', { body: { name: 'Acme' } });
    api.PUT.mockResolvedValue({ data: { id: 'm1' } });
    await updateEpfEmployer('m1', { name: 'Acme 2' });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/employers/{id}', { params: { path: { id: 'm1' } }, body: { name: 'Acme 2' } });
  });

  it('keeps the server message of a refused request', async () => {
    api.PUT.mockRejectedValue(new Error('down'));
    expect(await linkEpfEntryCredit('e1', 't1', false)).toMatchObject({ success: false, error: { message: "Couldn't link the bank credit. Try again." } });
  });
});
