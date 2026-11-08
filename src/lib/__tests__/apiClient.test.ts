import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  accountsApi,
  authApi,
  cardholdersApi,
  categoryListApi,
  dashboardsApi,
  gmailApi,
  investmentsApi,
  jobsApi,
  llmKeysApi,
  llmRoutingApi,
  loansApi,
  obligationsApi,
  reportsApi,
  rewardsApi,
  rulesApi,
  statementsApi,
  tagsApi,
  transactionsApi,
} from '@/lib/apiClient';

describe('apiClient (Server API Client Modernization & Coverage)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const mockResponse = (status: number, data: any) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => mockResponse(200, {}));
  });

  describe('authApi', () => {
    it('signup, login, googleStart, me, deleteAccount', async () => {
      fetchSpy.mockImplementation(async () => mockResponse(200, { id: 'u1', email: 'test@example.com' }));
      const user = await authApi.signup({ email: 'test@example.com', password: 'pass', inviteCode: 'code' });
      expect(user.id).toBe('u1');

      const { user: loginUser } = await authApi.login({ email: 'test@example.com', password: 'pass' });
      expect(loginUser.id).toBe('u1');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { authorizationUrl: 'https://accounts.google.com' }));
      const google = await authApi.googleStart();
      expect(google.authorizationUrl).toBe('https://accounts.google.com');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'u1', email: 'test@example.com' }));
      const me = await authApi.me();
      expect(me.id).toBe('u1');

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await authApi.deleteAccount({ password: 'pass' });
    });
  });

  describe('accountsApi & cardholdersApi', () => {
    it('handles accounts list, get and cycle summary', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'a1', name: 'Savings' }]));
      expect(await accountsApi.list()).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'a1', name: 'Savings' }));
      expect(await accountsApi.get('a1')).toEqual({ id: 'a1', name: 'Savings' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { currentCycleSpend: 1000 }));
      expect(await accountsApi.getCardCycleSummary('a1')).toEqual({ currentCycleSpend: 1000 });
    });

    it('lists cardholders', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'ch1', personName: 'John' }]));
      expect(await cardholdersApi.list('a1')).toHaveLength(1);
    });
  });

  describe('tags, the category list and dashboardsApi', () => {
    it('handles tag operations', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'c1', name: 'Food' }]));
      expect(await tagsApi.list()).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'c1', name: 'Food' }));
      expect(await tagsApi.create({ name: 'Food' })).toEqual({ id: 'c1', name: 'Food' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'c1', name: 'Groceries' }));
      expect(await tagsApi.rename('c1', { name: 'Groceries' })).toEqual({ id: 'c1', name: 'Groceries' });

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await tagsApi.delete('c1');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { tagsAdded: 2, transactionsFound: 2 }));
      expect(await tagsApi.bulkAdd({ transactionIds: ['t1', 't2'], tagIds: ['c1'] })).toEqual({ tagsAdded: 2, transactionsFound: 2 });
    });

    it('reads the fixed category list from the categories key', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { categories: [{ key: 'food', name: 'Food', subs: [] }] }));
      expect(await categoryListApi.list()).toEqual([{ key: 'food', name: 'Food', subs: [] }]);
    });

    it('handles dashboards operations', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'd1', name: 'Main' }]));
      expect(await dashboardsApi.list()).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'd1', name: 'Main' }));
      expect(await dashboardsApi.get('d1')).toEqual({ id: 'd1', name: 'Main' });
    });
  });

  describe('transactionsApi', () => {
    it('handles transactions search', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { content: [{ id: 't1' }], totalElements: 1 }));
      const searchRes = await transactionsApi.search({ filters: [] }, { page: 0, size: 10 });
      expect(searchRes.totalElements).toBe(1);
    });

    it('counts matching transactions with a POST to /transactions/count and no rows', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { count: 42 }));
      expect(await transactionsApi.count({ filters: [] })).toBe(42);
      const req = fetchSpy.mock.calls[0][0] as Request;
      expect(new URL(req.url).pathname).toBe('/api/v1/transactions/count');
      expect(req.method).toBe('POST');
      expect(new URL(req.url).search).toBe('');
    });

    it('asks for the reward report without dates when none are given', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { windowFrom: '2026-03-15', windowTo: '2027-03-14', defaultedWindow: true }));
      await rewardsApi.getReport('a1');
      expect(new URL((fetchSpy.mock.calls[0][0] as Request).url).search).toBe('?accountId=a1');
    });
  });

  describe('statementsApi', () => {
    it('handles statements listByAccount', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 's1' }]));
      expect(await statementsApi.listByAccount('a1')).toHaveLength(1);
    });
  });

  describe('jobsApi', () => {
    it('covers the jobs queue (list/get)', async () => {
      fetchSpy.mockImplementation(async () => mockResponse(200, {}));
      await jobsApi.list();
      await jobsApi.get('j1');
    });
  });

  describe('investments, loans, lending, reports, rewards, rules, gmail, llm APIs', () => {
    it('covers remaining domain APIs, including pageable-nested list endpoints', async () => {
      fetchSpy.mockImplementation(async () => mockResponse(200, {}));

      // Investments
      await investmentsApi.getSummary();
      await investmentsApi.getPositions();
      await investmentsApi.getTrades({ page: 0, size: 10, sort: 'tradeDate,desc' });
      await investmentsApi.getDividends({ page: 0, size: 10 });
      await investmentsApi.getDividendSuggestions();
      await investmentsApi.acceptDividendSuggestions({} as any);
      await investmentsApi.getCorporateActions();
      await investmentsApi.getInstruments();
      await investmentsApi.getInstrument('inst1');

      // Lending (obligations)
      await obligationsApi.getUpcoming();

      // Loans
      await loansApi.get('ln1');
      await loansApi.getSchedule('ln1');
      await loansApi.getMatchSuggestions('ln1');

      // Reports
      await reportsApi.list();
      await reportsApi.getById('r1');
      await reportsApi.getDatasource();
      await reportsApi.runSaved('r1');

      // Rewards
      await rewardsApi.listRules('a1');
      await rewardsApi.getAccountConfig('a1');
      await rewardsApi.listCapBuckets('a1');
      await rewardsApi.listMilestones('a1');
      await rewardsApi.getRewardLines({ accountId: 'a1', page: 0, size: 10 });

      // Rules (pageable-nested list — must not throw the "deeply-nested" error)
      await rulesApi.list({ page: 0, size: 20, categoryKey: 'food', search: 'uber' });

      // Gmail
      await gmailApi.listSenders();
      await gmailApi.listConnections();
      await gmailApi.getAttentionItems();

      // LLM keys & routing
      await llmKeysApi.list();
      await llmRoutingApi.getCatalog();
      await llmRoutingApi.getRoutingOptions();
      await llmRoutingApi.getRouting();
      await llmRoutingApi.getHealth();
    });

    it('throws ApiError on error response', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          timestamp: new Date().toISOString(),
        })
      );

      await expect(accountsApi.list()).rejects.toThrow('Invalid parameters');
    });
  });
});
