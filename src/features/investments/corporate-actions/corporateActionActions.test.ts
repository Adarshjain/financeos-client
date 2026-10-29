import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./corporateActionsServerApi', () => ({ fetchCorporateActionPreview: vi.fn() }));

import { createCorporateAction, deleteCorporateAction, updateCorporateAction } from './corporateActionActions';

beforeEach(() => vi.resetAllMocks());

describe('corporateActionsActions writes', () => {
  it('records, changes and deletes a corporate action of an instrument', async () => {
    api.POST.mockResolvedValue({ data: { id: 'c1' } });
    expect(await createCorporateAction('i1', { type: 'SPLIT' } as never)).toEqual({ success: true, data: { id: 'c1' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions', { params: { path: { instrumentId: 'i1' } }, body: { type: 'SPLIT' } });
    api.PUT.mockResolvedValue({ data: { id: 'c1' } });
    await updateCorporateAction('i1', 'c1', { type: 'BONUS' } as never);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId: 'i1', id: 'c1' } }, body: { type: 'BONUS' } });
    api.DELETE.mockResolvedValue({});
    await deleteCorporateAction('i1', 'c1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId: 'i1', id: 'c1' } } });
  });

  it('hands the server error code to the client (a 404 is NOT_FOUND, a 400 VALIDATION_ERROR)', async () => {
    const { ApiError } = await import('@/lib/apiClient');
    api.PUT.mockRejectedValue(new ApiError(404, { code: 'NOT_FOUND', message: 'Corporate action not found' }));
    expect(await updateCorporateAction('i1', 'c1', {} as never)).toMatchObject({ success: false, error: { code: 'NOT_FOUND', message: 'Corporate action not found' } });
    api.POST.mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'A bonus needs more units after than before' }));
    expect(await createCorporateAction('i1', {} as never)).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });
});
