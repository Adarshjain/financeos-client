import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./fnoServerApi', () => ({ fetchFnoCsv: vi.fn() }));

import { createFnoTrade, deleteFnoTrade, updateFnoTrade } from './fnoActions';

beforeEach(() => vi.resetAllMocks());

describe('fnoActions trades', () => {
  it('records, changes and deletes an F&O trade', async () => {
    const body = { symbol: 'NIFTY' } as never;
    api.POST.mockResolvedValue({ data: { id: 'f1' } });
    expect(await createFnoTrade(body)).toEqual({ success: true, data: { id: 'f1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/fno', { body });

    api.PUT.mockResolvedValue({ data: { id: 'f1' } });
    await updateFnoTrade('f1', body);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/fno/{id}', { params: { path: { id: 'f1' } }, body });

    api.DELETE.mockResolvedValue({});
    await deleteFnoTrade('f1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/fno/{id}', { params: { path: { id: 'f1' } } });
  });

  it('reports a failure instead of throwing', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    expect(await createFnoTrade({} as never)).toMatchObject({ success: false, error: { message: "Couldn't save the F&O trade. Try again." } });
  });
});
