import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import * as actions from './lendingActions';

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({ data: { id: 'x' } });
});

describe('lendings actions', () => {
  it('createLendingEntry posts the entry and returns it', async () => {
    const body = { counterpartyId: 'c1', direction: 'lent', amount: 5, entryDate: '2026-10-13' } as never;
    expect(await actions.createLendingEntry(body)).toEqual({ success: true, data: { id: 'x' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', { body });
  });

  it('updateLendingEntry puts the changes on the entry', async () => {
    await actions.updateLendingEntry('l1', { amount: 7 });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}', { params: { path: { id: 'l1' } }, body: { amount: 7 } });
  });

  it('deleteLendingEntry deletes the entry', async () => {
    expect(await actions.deleteLendingEntry('l1')).toEqual({ success: true, data: undefined });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}', { params: { path: { id: 'l1' } } });
  });

  it('linkLendingEntryTransaction attaches the transaction', async () => {
    await actions.linkLendingEntryTransaction('l1', 't1');
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
      body: { transactionId: 't1' },
    });
  });

  it('unlinkLendingEntryTransaction detaches it', async () => {
    await actions.unlinkLendingEntryTransaction('l1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', { params: { path: { id: 'l1' } } });
  });

  it('recordCounterpartySettlement posts the transfer as a settlement', async () => {
    await actions.recordCounterpartySettlement('p1', 't1');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/counterparties/{id}/settlements', {
      params: { path: { id: 'p1' } },
      body: { transactionId: 't1' },
    });
  });

  it('updateCounterparty and deleteCounterparty hit the person', async () => {
    await actions.updateCounterparty('p1', { name: 'Rahul' });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/counterparties/{id}', { params: { path: { id: 'p1' } }, body: { name: 'Rahul' } });
    await actions.deleteCounterparty('p1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/counterparties/{id}', { params: { path: { id: 'p1' } } });
  });

  it('reports a failure with the call site message instead of throwing', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    const result = await actions.createLendingEntry({} as never);
    expect(result).toMatchObject({ success: false, error: { message: "Couldn't record lending. Try again." } });
  });
});
