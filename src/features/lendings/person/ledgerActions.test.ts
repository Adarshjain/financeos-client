import { beforeEach, describe, expect, it, vi } from 'vitest';

const ledger = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', async (orig) => ({
  ...(await orig<typeof import('@/lib/apiClient')>()),
  counterpartiesApi: { ledger },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadPersonLedger } from './ledgerActions';

beforeEach(() => vi.clearAllMocks());

describe('loadPersonLedger', () => {
  it('asks for every entry in one page and returns them with the cycles', async () => {
    ledger.mockResolvedValue({ entries: { content: [{ id: 'e1' }] }, cycles: [{ number: 1 }] });
    expect(await loadPersonLedger('p1', 40)).toEqual({
      success: true,
      data: { entries: [{ id: 'e1' }], cycles: [{ number: 1 }] },
    });
    expect(ledger).toHaveBeenCalledWith('p1', 0, 40);
  });

  it('asks for at least one entry', async () => {
    ledger.mockResolvedValue({ entries: { content: [] }, cycles: [] });
    await loadPersonLedger('p1', 0);
    expect(ledger).toHaveBeenCalledWith('p1', 0, 1);
  });

  it('reports a failure instead of throwing', async () => {
    ledger.mockRejectedValue(new Error('down'));
    expect((await loadPersonLedger('p1', 3)).success).toBe(false);
  });
});
