import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({ fetchHoldings: vi.fn(), fetchTaxHarvest: vi.fn(), fetchBrokers: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => server);
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { groups, holdingRow,holdingsResponse } from './holdings.fixtures';
import { loadHoldingsScreen } from './holdingsScreenData';

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchTaxHarvest.mockResolvedValue(null);
  server.fetchBrokers.mockResolvedValue([]);
});

const state = { type: 'STOCK', page: 1, sort: 'name' } as never;

describe('loadHoldingsScreen', () => {
  it('reads holdings once and takes movers and allocation from that response', async () => {
    const whole = [{ assetType: 'STOCK', value: 100, count: 1 }, { assetType: 'MUTUAL_FUND', value: 300, count: 2 }] as never;
    server.fetchHoldings.mockResolvedValue(
      holdingsResponse([holdingRow({ symbol: 'X' })], {
        totalPages: 3,
        movers: [{ instrumentId: 'a', symbol: 'INFY', name: 'Infosys', dayChange: 1860 }],
        portfolioGroups: whole,
      }),
    );
    const res = await loadHoldingsScreen(state);
    expect(server.fetchHoldings).toHaveBeenCalledTimes(1);
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.movers).toEqual([{ id: 'a', symbol: 'INFY', amount: '+₹1,860', tone: 'positive' }]);
    expect(res.data.allocation).toHaveLength(2);
  });

  it('falls back to the page groups when the response has no portfolio groups', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { portfolioGroups: undefined as never, movers: undefined as never }));
    const res = await loadHoldingsScreen({ sort: 'name', page: 0 } as never);
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.allocation.length).toBe(groups.filter((g) => g.value > 0).length);
    expect(res.data.movers).toEqual([]);
  });
});
