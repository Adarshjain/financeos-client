import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getTrades: vi.fn(),
  getHoldings: vi.fn(),
  getPriceHistory: vi.fn(),
}));
vi.mock('@/lib/apiClient', () => ({
  investmentsApi: api,
  dividendsApi: { list: vi.fn() },
  corporateActionsApi: {},
  accountsApi: {},
  fnoApi: {},
  instrumentsApi: { getPriceHistory: api.getPriceHistory },
  jobsApi: {},
}));

import { fetchHoldings, fetchInstrumentTrades, fetchPriceHistory } from './investmentsServerApi';

beforeEach(() => vi.clearAllMocks());

describe('fetchInstrumentTrades', () => {
  it("asks for one instrument's trades newest first, a page at a time", async () => {
    api.getTrades.mockResolvedValue({ content: [] });
    await fetchInstrumentTrades('i1', 2, 25);
    expect(api.getTrades).toHaveBeenCalledWith({ instrumentId: 'i1', page: 2, size: 25, sort: 'tradeDate,desc' });
  });
});

describe('fetchHoldings', () => {
  it('hands the sort and its direction to the holdings endpoint', async () => {
    api.getHoldings.mockResolvedValue({ holdings: [] });
    await fetchHoldings({ sort: 'return_pct', dir: 'asc', page: 0, size: 50 });
    expect(api.getHoldings).toHaveBeenCalledWith({ sort: 'return_pct', dir: 'asc', page: 0, size: 50 });
  });

  it('sends no direction when the query has none', async () => {
    api.getHoldings.mockResolvedValue({ holdings: [] });
    await fetchHoldings({ sort: 'name', page: 0, size: 50 });
    expect(api.getHoldings.mock.calls[0][0]).not.toHaveProperty('dir');
  });
});

describe('fetchPriceHistory', () => {
  it('passes the chart point cap through, and none when not given', async () => {
    api.getPriceHistory.mockResolvedValue([]);
    await fetchPriceHistory('i1', 200);
    expect(api.getPriceHistory).toHaveBeenLastCalledWith('i1', 200);
    await fetchPriceHistory('i1');
    expect(api.getPriceHistory).toHaveBeenLastCalledWith('i1', undefined);
  });
});
