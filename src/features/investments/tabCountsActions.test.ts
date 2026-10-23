import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({
  fetchTradebookCount: vi.fn(),
  fetchDividendsCount: vi.fn(),
  fetchFnoCount: vi.fn(),
  fetchCorporateActionsCount: vi.fn(),
}));
vi.mock('./investmentsServerApi', () => server);
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadTabCounts } from './tabCountsActions';

describe('loadTabCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the four tab totals', async () => {
    server.fetchTradebookCount.mockResolvedValue(38);
    server.fetchDividendsCount.mockResolvedValue(5);
    server.fetchFnoCount.mockResolvedValue(5);
    server.fetchCorporateActionsCount.mockResolvedValue(2);
    const result = await loadTabCounts();
    expect(result).toEqual({ success: true, data: { tradebook: 38, dividends: 5, fno: 5, 'corporate-actions': 2 } });
  });

  it('fails as one when any count fails', async () => {
    server.fetchTradebookCount.mockResolvedValue(1);
    server.fetchDividendsCount.mockRejectedValue(new Error('boom'));
    server.fetchFnoCount.mockResolvedValue(1);
    server.fetchCorporateActionsCount.mockResolvedValue(1);
    const result = await loadTabCounts();
    expect(result.success).toBe(false);
  });
});
