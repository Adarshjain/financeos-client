import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createInstrument, resetInstrumentOverrides, resolveInstrument, searchCatalog, updateInstrument } from './instrumentActions';

beforeEach(() => vi.resetAllMocks());

describe('instrumentActions', () => {
  it('searches the catalog', async () => {
    api.GET.mockResolvedValue({ data: [{ symbol: 'INFY' }] });
    expect(await searchCatalog('inf', 'STOCK' as never)).toEqual({ success: true, data: [{ symbol: 'INFY' }] });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/instruments/catalog-search', { params: { query: { q: 'inf', type: 'STOCK' } } });
  });

  it('resolves a candidate and creates an instrument', async () => {
    api.POST.mockResolvedValue({ data: { id: 'i1' } });
    expect(await resolveInstrument({ symbol: 'INFY' } as never)).toEqual({ success: true, data: { id: 'i1' } });
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/instruments/resolve', { body: { symbol: 'INFY' } });
    await createInstrument({ name: 'X' } as never);
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/instruments', { body: { name: 'X' } });
  });

  it('edits only, leaving the asset class alone when none is given', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'i1', mergedHoldings: true, mergeNote: 'note' } });
    const result = await updateInstrument('i1', { name: 'X' } as never);
    expect(api.PATCH).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: { instrument: { id: 'i1', mergedHoldings: true, mergeNote: 'note' }, moved: false, merged: true, mergeNote: 'note' } });
  });

  it('pins the asset class on the instrument the edit resolved to, and reports the move', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'i2' } });
    api.PATCH.mockResolvedValue({ data: { id: 'i2', assetClass: 'EQUITY' } });
    const result = await updateInstrument('i1', { name: 'X' } as never, 'EQUITY' as never);
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/instruments/{id}', { params: { path: { id: 'i2' } }, body: { assetClass: 'EQUITY' } });
    expect(result).toMatchObject({ success: true, data: { moved: true, merged: false, mergeNote: null } });
  });

  it('clears the asset class with null', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'i1' } });
    api.PATCH.mockResolvedValue({ data: { id: 'i1' } });
    await updateInstrument('i1', {} as never, null);
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/instruments/{id}', { params: { path: { id: 'i1' } }, body: { assetClass: null } });
  });

  it('resets the overrides', async () => {
    api.DELETE.mockResolvedValue({ data: { id: 'i1' } });
    expect(await resetInstrumentOverrides('i1')).toEqual({ success: true, data: { id: 'i1' } });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{id}/overrides', { params: { path: { id: 'i1' } } });
  });

  it('reports a failure instead of throwing', async () => {
    api.PUT.mockRejectedValue(new Error('down'));
    expect(await updateInstrument('i1', {} as never)).toMatchObject({ success: false, error: { message: "Couldn't update instrument. Try again." } });
  });
});
