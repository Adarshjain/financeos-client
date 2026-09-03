import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  accountsApi,
  authApi,
  cardholdersApi,
  categoriesApi,
  counterpartiesApi,
  dashboardsApi,
  gmailApi,
  ingestionApi,
  investmentsApi,
  jobsApi,
  lendingsApi,
  llmKeysApi,
  llmRoutingApi,
  loansApi,
  obligationsApi,
  reportsApi,
  rewardsApi,
  rulesApi,
  statementsApi,
  transactionLinksApi,
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
    it('signup, login, googleStart, me, deleteAccount, getDeletionSummary', async () => {
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

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { counts: {}, total: 0 }));
      const summary = await authApi.getDeletionSummary();
      expect(summary.total).toBe(0);
    });
  });

  describe('accountsApi & cardholdersApi', () => {
    it('handles accounts CRUD and cycle summary', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'a1', name: 'Savings' }]));
      expect(await accountsApi.list()).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'a1', name: 'Savings' }));
      expect(await accountsApi.get('a1')).toEqual({ id: 'a1', name: 'Savings' });

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'a1' }));
      expect(await accountsApi.create({ name: 'Savings', type: 'bank_account' } as any)).toEqual({ id: 'a1' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'a1' }));
      expect(await accountsApi.update('a1', { name: 'Savings Updated', type: 'bank_account' } as any)).toEqual({ id: 'a1' });

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await accountsApi.delete('a1');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { currentCycleSpend: 1000 }));
      expect(await accountsApi.getCardCycleSummary('a1')).toEqual({ currentCycleSpend: 1000 });
    });

    it('handles cardholders CRUD and actions', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'ch1', personName: 'John' }]));
      expect(await cardholdersApi.list('a1')).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'ch1' }));
      expect(await cardholdersApi.create('a1', { personName: 'John', relationship: 'SELF' } as any)).toEqual({ id: 'ch1' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'ch1' }));
      expect(await cardholdersApi.update('a1', 'ch1', { personName: 'John D' } as any)).toEqual({ id: 'ch1' });

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await cardholdersApi.delete('a1', 'ch1');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'ch1', closedOn: '2026-09-01' }));
      expect(await cardholdersApi.close('a1', 'ch1')).toEqual({ id: 'ch1', closedOn: '2026-09-01' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'ch1', closedOn: null }));
      expect(await cardholdersApi.reopen('a1', 'ch1')).toEqual({ id: 'ch1', closedOn: null });

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'card1', last4: '1234' }));
      expect(await cardholdersApi.createCard('a1', 'ch1', { last4: '1234' } as any)).toEqual({ id: 'card1', last4: '1234' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'card2', last4: '5678' }));
      expect(await cardholdersApi.replaceCard('a1', 'ch1', 'card1', { newLast4: '5678' })).toEqual({ id: 'card2', last4: '5678' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'card2', closedOn: '2026-09-01' }));
      expect(await cardholdersApi.closeCard('a1', 'ch1', 'card2')).toEqual({ id: 'card2', closedOn: '2026-09-01' });

      // Back-compat alias — card id doubles as cardholder id.
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'card3', last4: '9999' }));
      expect(await cardholdersApi.replace('a1', 'card1', { newLast4: '9999' })).toEqual({ id: 'card3', last4: '9999' });
    });
  });

  describe('categoriesApi & dashboardsApi', () => {
    it('handles categories operations', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'c1', name: 'Food' }]));
      expect(await categoriesApi.list()).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'c1', name: 'Food' }));
      expect(await categoriesApi.create({ name: 'Food' })).toEqual({ id: 'c1', name: 'Food' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'c1', name: 'Groceries' }));
      expect(await categoriesApi.update('c1', { name: 'Groceries' })).toEqual({ id: 'c1', name: 'Groceries' });

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await categoriesApi.delete('c1');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { categoryId: 'c1', fromRule: true }));
      expect(await categoriesApi.categorize({ description: 'Uber' })).toEqual({ categoryId: 'c1', fromRule: true });
    });

    it('handles dashboards operations', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'd1', name: 'Main' }]));
      expect(await dashboardsApi.list()).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'd1', name: 'Main' }));
      expect(await dashboardsApi.get('d1')).toEqual({ id: 'd1', name: 'Main' });

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'd1', name: 'Main' }));
      expect(await dashboardsApi.create({ name: 'Main', isDefault: true, widgets: [] })).toEqual({ id: 'd1', name: 'Main' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 'd1', name: 'Main Updated' }));
      expect(await dashboardsApi.update('d1', { name: 'Main Updated', isDefault: true, widgets: [] })).toEqual({ id: 'd1', name: 'Main Updated' });

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await dashboardsApi.delete('d1');
    });
  });

  describe('transactionsApi & transactionLinksApi', () => {
    it('handles transactions search, crud, batch operations', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { content: [{ id: 't1' }], totalElements: 1 }));
      const searchRes = await transactionsApi.search({ filters: [] }, { page: 0, size: 10 });
      expect(searchRes.totalElements).toBe(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 't1' }));
      expect(await transactionsApi.create({ accountId: 'a1', amount: 50, date: '2026-09-01', categoryIds: [] } as any)).toEqual({ id: 't1' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 't1' }));
      expect(await transactionsApi.update('t1', { accountId: 'a1', amount: 75, date: '2026-09-01', categoryIds: [] } as any)).toEqual({ id: 't1' });

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await transactionsApi.delete('t1');

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { succeededIds: ['t1'], failures: [] }));
      expect(await transactionsApi.batchDelete({ transactionIds: ['t1'] })).toEqual({ succeededIds: ['t1'], failures: [] });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { succeededIds: ['t1'], skippedIds: [], failures: [] }));
      expect(await transactionsApi.batchReview({ transactionIds: ['t1'], reviewType: 'MANUALLY_REVIEWED' })).toEqual({ succeededIds: ['t1'], skippedIds: [], failures: [] });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { mergedTransactionId: 't1', deletedTransactionId: 't2' }));
      expect(await transactionsApi.merge({ deleteId: 't2', keepId: 't1' })).toEqual({ mergedTransactionId: 't1', deletedTransactionId: 't2' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { updatedCount: 5 }));
      expect(await transactionsApi.bulkReattributeCard({ accountId: 'a1', cardId: 'c1' })).toEqual({ updatedCount: 5 });
    });

    it('handles transaction links create, list and delete', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { id: 'link1', type: 'TRANSFER' }));
      expect(await transactionLinksApi.create({ type: 'TRANSFER', members: [] } as any)).toEqual({ id: 'link1', type: 'TRANSFER' });

      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 'link1', type: 'TRANSFER' }]));
      expect(await transactionLinksApi.getByTransactionId('t1')).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await transactionLinksApi.delete('link1');
    });
  });

  describe('statementsApi', () => {
    it('handles statements listByAccount and getById', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, [{ id: 's1' }]));
      expect(await statementsApi.listByAccount('a1')).toHaveLength(1);

      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 's1', lines: [] }));
      expect(await statementsApi.getById('s1')).toEqual({ id: 's1', lines: [] });
    });
  });

  describe('ingestionApi (multipart) & jobsApi', () => {
    it('uploads a multi-MB file without JSON content-type', async () => {
      const bigBuffer = new Uint8Array(2 * 1024 * 1024); // 2MB
      const formData = new FormData();
      formData.append('files', new Blob([bigBuffer], { type: 'application/pdf' }), 'statement.pdf');

      let interceptedContentType: string | null = null;
      fetchSpy.mockImplementation(async (_input: any, init?: any) => {
        const headers = new Headers(init?.headers);
        interceptedContentType = headers.get('Content-Type');
        return new Response(JSON.stringify({ jobId: 'job-123' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      const res = await ingestionApi.ingest('a1', formData);
      expect(res.jobId).toBe('job-123');
      expect(interceptedContentType).not.toBe('application/json');
    });

    it('covers the jobs queue (list/get/cancel/retry)', async () => {
      fetchSpy.mockImplementation(async () => mockResponse(200, {}));
      await jobsApi.list();
      await jobsApi.get('j1');
      await jobsApi.cancel('j1');
      await jobsApi.retry('j1');
    });
  });

  describe('investments, loans, lending, reports, rewards, rules, gmail, llm APIs', () => {
    it('covers remaining domain APIs, including pageable-nested list endpoints', async () => {
      fetchSpy.mockImplementation(async () => mockResponse(200, {}));

      // Investments
      await investmentsApi.getSummary();
      await investmentsApi.getPositions();
      await investmentsApi.getTrades({ page: 0, size: 10, sort: 'tradeDate,desc' });
      await investmentsApi.createTrade({} as any);
      await investmentsApi.updateTrade('i1', {} as any);
      await investmentsApi.deleteTrade('i1');
      await investmentsApi.getFnoTrades();
      await investmentsApi.createFnoTrade({} as any);
      await investmentsApi.updateFnoTrade('f1', {} as any);
      await investmentsApi.deleteFnoTrade('f1');
      await investmentsApi.getDividends({ page: 0, size: 10 });
      await investmentsApi.createDividend({} as any);
      await investmentsApi.updateDividend('d1', {} as any);
      await investmentsApi.deleteDividend('d1');
      await investmentsApi.getDividendSuggestions();
      await investmentsApi.acceptDividendSuggestions({} as any);
      await investmentsApi.getCorporateActions();
      await investmentsApi.createCorporateAction('inst1', {} as any);
      await investmentsApi.updateCorporateAction('inst1', 'ca1', {} as any);
      await investmentsApi.deleteCorporateAction('inst1', 'ca1');
      await investmentsApi.getInstruments();
      await investmentsApi.getInstrument('inst1');
      await investmentsApi.createInstrument({} as any);
      await investmentsApi.setInstrumentPrice('inst1', {} as any);
      await investmentsApi.refreshPrices();
      await investmentsApi.commitImport({} as any);
      await investmentsApi.commitReconcile({} as any);

      // Lending (counterparties / lendings / obligations)
      await counterpartiesApi.list();
      await counterpartiesApi.create({ name: 'Alice' });
      await counterpartiesApi.update('cp1', { name: 'Alice 2' });
      await counterpartiesApi.remove('cp1');
      await lendingsApi.list();
      await lendingsApi.getDetail('l1');
      await lendingsApi.create({} as any);
      await lendingsApi.update('l1', {} as any);
      await lendingsApi.remove('l1');
      await obligationsApi.getUpcoming();

      // Loans
      await loansApi.list();
      await loansApi.get('ln1');
      await loansApi.create({} as any);
      await loansApi.update('ln1', {} as any);
      await loansApi.delete('ln1');
      await loansApi.createPayment('ln1', {} as any);
      await loansApi.deletePayment('ln1', 'p1');
      await loansApi.createEvent('ln1', {} as any);
      await loansApi.deleteEvent('ln1', 'e1');
      await loansApi.createCharge('ln1', {} as any);
      await loansApi.deleteCharge('ln1', 'c1');
      await loansApi.getSummary();
      await loansApi.getSchedule('ln1');
      await loansApi.getMatchSuggestions('ln1');
      await loansApi.batchPayments('ln1', { items: [] });

      // Reports
      await reportsApi.list();
      await reportsApi.getById('r1');
      await reportsApi.create({} as any);
      await reportsApi.update('r1', {} as any);
      await reportsApi.delete('r1');
      await reportsApi.getDatasource();
      await reportsApi.runSaved('r1');
      await reportsApi.runAdHoc({} as any);

      // Rewards
      await rewardsApi.listRules('a1');
      await rewardsApi.createRule({} as any);
      await rewardsApi.updateRule('rw1', {} as any);
      await rewardsApi.deleteRule('rw1');
      await rewardsApi.reorderRules({ accountId: 'a1', orderedIds: ['rw1'] });
      await rewardsApi.getAccountConfig('a1');
      await rewardsApi.updateAccountConfig({ accountId: 'a1' });
      await rewardsApi.listCapBuckets('a1');
      await rewardsApi.createCapBucket({} as any);
      await rewardsApi.updateCapBucket('b1', {} as any);
      await rewardsApi.deleteCapBucket('b1');
      await rewardsApi.listMilestones('a1');
      await rewardsApi.createMilestone({} as any);
      await rewardsApi.updateMilestone('m1', {} as any);
      await rewardsApi.deleteMilestone('m1');
      await rewardsApi.report({ accountId: 'a1', from: '2026-01-01', to: '2026-09-01' });
      await rewardsApi.recommend({} as any);
      await rewardsApi.getRewardLines({ accountId: 'a1', page: 0, size: 10 });

      // Rules (pageable-nested list — must not throw the "deeply-nested" error)
      await rulesApi.list({ page: 0, size: 20, verified: false, search: 'uber' });
      await rulesApi.create({} as any);
      await rulesApi.update('rl1', {} as any);
      await rulesApi.delete('rl1');
      await rulesApi.apply('rl1');
      await rulesApi.previewMatches({} as any);

      // Gmail
      await gmailApi.startOAuth();
      await gmailApi.sync();
      await gmailApi.listSenders();
      await gmailApi.createSender({} as any);
      await gmailApi.updateSender('s1', {} as any);
      await gmailApi.deleteSender('s1');
      await gmailApi.listConnections();
      await gmailApi.disconnectConnection('c1');
      await gmailApi.getAttentionItems();
      await gmailApi.retryAttentionItem('ledger-1');
      await gmailApi.rescan('2026-01-01');

      // LLM keys & routing
      await llmKeysApi.list();
      await llmKeysApi.create({} as any);
      await llmKeysApi.updatePosition('k1', 1);
      await llmKeysApi.delete('k1');
      await llmKeysApi.test('k1');
      await llmRoutingApi.getTaskGroups();
      await llmRoutingApi.getCatalog();
      await llmRoutingApi.getRoutingOptions();
      await llmRoutingApi.getRouting();
      await llmRoutingApi.updateRouting('chat', { entries: [] });
      await llmRoutingApi.resetRouting('chat');
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
