import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getTrades: vi.fn(),
  getHoldings: vi.fn(),
}));
vi.mock('@/lib/apiClient', () => ({
  investmentsApi: api,
  dividendsApi: { list: vi.fn() },
  corporateActionsApi: {},
  accountsApi: {},
  fnoApi: {},
  instrumentsApi: {},
  jobsApi: {},
}));

import { fetchInstrumentTrades } from './investmentsServerApi';

beforeEach(() => vi.clearAllMocks());

describe('fetchInstrumentTrades', () => {
  it("asks for one instrument's trades newest first, a page at a time", async () => {
    api.getTrades.mockResolvedValue({ content: [] });
    await fetchInstrumentTrades('i1', 2, 25);
    expect(api.getTrades).toHaveBeenCalledWith({ instrumentId: 'i1', page: 2, size: 25, sort: 'tradeDate,desc' });
  });
});
