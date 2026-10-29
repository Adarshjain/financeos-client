import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { deleteInstrumentPrice, setInstrumentPrice, startPriceRefresh, updateInstrumentPrice } from './priceActions';

beforeEach(() => vi.resetAllMocks());

describe('priceActions', () => {
  it('sets a manual price for an instrument', async () => {
    api.POST.mockResolvedValue({});
    expect(await setInstrumentPrice('i1', { price: 10, asOf: '2026-10-01' })).toEqual({ success: true, data: undefined });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{id}/price', { params: { path: { id: 'i1' } }, body: { price: 10, asOf: '2026-10-01' } });
  });

  it('changes a price, sending the date only when given', async () => {
    api.PUT.mockResolvedValue({});
    await updateInstrumentPrice('i1', 'p1', 12, '2026-10-02');
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: 'i1', priceId: 'p1' } },
      body: { price: 12, asOf: '2026-10-02' },
    });
    await updateInstrumentPrice('i1', 'p1', 13);
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: 'i1', priceId: 'p1' } },
      body: { price: 13 },
    });
  });

  it('deletes a price', async () => {
    api.DELETE.mockResolvedValue({});
    await deleteInstrumentPrice('i1', 'p1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/prices/{priceId}', { params: { path: { instrumentId: 'i1', priceId: 'p1' } } });
  });

  it('starts the refresh job and returns its id', async () => {
    api.POST.mockResolvedValue({ data: { jobId: 'j1' } });
    expect(await startPriceRefresh()).toEqual({ success: true, data: { jobId: 'j1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/prices/refresh', { params: { query: {} } });
  });

  it('reports a failure with the action fallback instead of throwing', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    expect(await startPriceRefresh()).toMatchObject({ success: false, error: { message: "Couldn't refresh prices. Try again." } });
    expect(await setInstrumentPrice('i1', { price: 1 })).toMatchObject({ success: false, error: { message: "Couldn't update the price. Try again." } });
  });
});
