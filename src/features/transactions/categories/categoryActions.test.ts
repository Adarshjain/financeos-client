import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createCategory, deleteCategory, renameCategory } from './categoryActions';

beforeEach(() => vi.clearAllMocks());

describe('category actions', () => {
  it('creates a category', async () => {
    mocks.POST.mockResolvedValue({ data: { id: 'c1', name: 'Food' } });
    expect(await createCategory('Food')).toEqual({ success: true, data: { id: 'c1', name: 'Food' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/categories', { body: { name: 'Food' } });
  });

  it('renames a category', async () => {
    mocks.PUT.mockResolvedValue({ data: { id: 'c1', name: 'Eating out' } });
    expect(await renameCategory('c1', 'Eating out')).toEqual({ success: true, data: { id: 'c1', name: 'Eating out' } });
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/categories/{id}', { params: { path: { id: 'c1' } }, body: { name: 'Eating out' } });
  });

  it('deletes a category', async () => {
    mocks.DELETE.mockResolvedValue({ data: undefined });
    expect((await deleteCategory('c1')).success).toBe(true);
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/categories/{id}', { params: { path: { id: 'c1' } } });
  });

  it('reports a failure with the fallback message', async () => {
    mocks.DELETE.mockRejectedValue(new Error('down'));
    expect(await deleteCategory('c1')).toMatchObject({ success: false, error: { message: "Couldn't delete the category. Try again." } });
  });
});
