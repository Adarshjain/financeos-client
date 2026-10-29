import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadPersonMatches } from './personMatchActions';

beforeEach(() => vi.clearAllMocks());

describe('loadPersonMatches', () => {
  it("asks for this person's suggestions and returns them", async () => {
    get.mockResolvedValue({ data: { suggestions: [{ lendingId: 'e1', candidates: [] }] } });
    const result = await loadPersonMatches('p1');
    expect(get).toHaveBeenCalledWith('/api/v1/counterparties/{id}/match-suggestions', { params: { path: { id: 'p1' } } });
    expect(result).toEqual({ success: true, data: [{ lendingId: 'e1', candidates: [] }] });
  });

  it('returns an empty list when the server sends none', async () => {
    get.mockResolvedValue({ data: undefined });
    expect(await loadPersonMatches('p1')).toEqual({ success: true, data: [] });
  });

  it('reports a failure instead of throwing', async () => {
    get.mockRejectedValue(new Error('down'));
    const result = await loadPersonMatches('p1');
    expect(result.success).toBe(false);
  });
});
