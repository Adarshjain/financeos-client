import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createTradeAction, deleteTradeAction, updateTradeAction } from './tradeActions';

beforeEach(() => vi.resetAllMocks());

describe('tradeActions', () => {
  it('records a trade and returns it', async () => {
    api.POST.mockResolvedValue({ data: { id: 't1' } });
    const body = { instrumentId: 'i1' } as never;
    expect(await createTradeAction(body)).toEqual({ success: true, data: { id: 't1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/transactions', { body });
  });

  it('changes a trade', async () => {
    api.PUT.mockResolvedValue({ data: { id: 't1' } });
    const body = { quantity: 2 } as never;
    expect(await updateTradeAction('t1', body)).toEqual({ success: true, data: { id: 't1' } });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/transactions/{id}', { params: { path: { id: 't1' } }, body });
  });

  it('deletes a trade', async () => {
    api.DELETE.mockResolvedValue({});
    expect(await deleteTradeAction('t1')).toEqual({ success: true, data: undefined });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/transactions/{id}', { params: { path: { id: 't1' } } });
  });

  it('reports a failure instead of throwing', async () => {
    api.DELETE.mockRejectedValue(new Error('down'));
    expect(await deleteTradeAction('t1')).toMatchObject({ success: false, error: { message: "Couldn't delete the trade. Try again." } });
  });
});
