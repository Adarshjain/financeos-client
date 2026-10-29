import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadDeletionSummary } from './deletionSummaryActions';

beforeEach(() => vi.clearAllMocks());

describe('loadDeletionSummary', () => {
  it('returns the counts', async () => {
    get.mockResolvedValue({ data: { total: 3, counts: {} } });
    expect(await loadDeletionSummary()).toEqual({ success: true, data: { total: 3, counts: {} } });
    expect(get).toHaveBeenCalledWith('/api/v1/auth/me/deletion-summary');
  });

  it('returns null when the server sends no body', async () => {
    get.mockResolvedValue({ data: undefined });
    expect(await loadDeletionSummary()).toEqual({ success: true, data: null });
  });

  it('reports a failure instead of throwing', async () => {
    get.mockRejectedValue(new Error('down'));
    expect((await loadDeletionSummary()).success).toBe(false);
  });
});
