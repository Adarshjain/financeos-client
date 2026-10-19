import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';

import { loadBillsHistory } from './billsHistory';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: get } }));

describe('loadBillsHistory', () => {
  beforeEach(() => get.mockReset());

  it('makes one history request with the limit and builds each entry from its bill', async () => {
    const bills = [
      { statementId: 's2', periodEnd: '2026-10-10' },
      { statementId: 's1', periodEnd: null },
    ] as unknown as CardBillResponse[];
    get.mockResolvedValue({ data: bills });
    const entries = await loadBillsHistory('c1');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/api/v1/bills/history', {
      params: { query: { accountId: 'c1', limit: 3 } },
    });
    expect(entries).toEqual([
      { statementId: 's2', periodEnd: '2026-10-10', bill: bills[0] },
      { statementId: 's1', periodEnd: '', bill: bills[1] },
    ]);
  });

  it('throws when the request fails', async () => {
    get.mockResolvedValue({ data: undefined, error: { message: 'boom' } });
    await expect(loadBillsHistory('c1')).rejects.toThrow();
  });
});
