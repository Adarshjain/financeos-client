import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({ fetchPeople: vi.fn(), fetchLoansSummary: vi.fn() }));
vi.mock('./loansServerApi', () => server);
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadTabCounts } from './tabCountsActions';

beforeEach(() => {
  server.fetchPeople.mockReset();
  server.fetchLoansSummary.mockReset();
});

describe('loadTabCounts', () => {
  it('counts all people (settled included) and active loans', async () => {
    server.fetchPeople.mockResolvedValue({ totalElements: 4 });
    server.fetchLoansSummary.mockResolvedValue({ activeLoanCount: 3, closedLoanCount: 1 });
    await expect(loadTabCounts()).resolves.toEqual({ success: true, data: { lendings: 4, loans: 3 } });
    expect(server.fetchPeople).toHaveBeenCalledWith({ size: 1 });
  });

  it('reports a failure instead of throwing', async () => {
    server.fetchPeople.mockRejectedValue(new Error('down'));
    server.fetchLoansSummary.mockResolvedValue({ activeLoanCount: 3 });
    const result = await loadTabCounts();
    expect(result.success).toBe(false);
  });
});
