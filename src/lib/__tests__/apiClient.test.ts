import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  accountsApi,
  ApiError,
  authApi,
  categoriesApi,
  dashboardApi,
  dashboardsApi,
  gmailApi,
  ingestionApi,
  investmentsApi,
  reportsApi,
  rulesApi,
  statementsApi,
  transactionLinksApi,
  transactionsApi,
} from '@/lib/apiClient';

describe('apiClient (CD-14 & API wrapper coverage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockFetchResponse = (ok: boolean, status: number, body: any, headers?: Record<string, string>) => {
    const headerObj = new Headers(headers || {});
    return Promise.resolve({
      ok,
      status,
      headers: headerObj,
      json: () => (typeof body === 'string' ? Promise.reject(new Error('Invalid JSON')) : Promise.resolve(body)),
      text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    } as Response);
  };

  describe('authApi', () => {
    it('login returns user and sessionCookie when present', async () => {
      const headers = new Headers();
      headers.set('set-cookie', 'FINANCEOS_SESSION=secret-token; Path=/');
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 'u1', email: 'test@example.com' }), { status: 200, headers })),
      );

      const res = await authApi.login({ email: 'test@example.com', password: 'password' });
      expect(res.user.id).toBe('u1');
      expect(res.sessionCookie).toBe('secret-token');
    });

    it('login handles non-matching cookie header', async () => {
      const headers = new Headers();
      headers.set('set-cookie', 'OTHER_COOKIE=abc; Path=/');
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 'u1', email: 'test@example.com' }), { status: 200, headers })),
      );

      const res = await authApi.login({ email: 'test@example.com', password: 'password' });
      expect(res.sessionCookie).toBeUndefined();
    });

    it('handleGoogleCallback returns user and sessionCookie when present', async () => {
      const headers = new Headers();
      headers.set('set-cookie', 'FINANCEOS_SESSION=google-token; Path=/');
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 'u2', email: 'g@example.com' }), { status: 200, headers })),
      );

      const res = await authApi.handleGoogleCallback({ code: 'c123', state: 's123', error: 'err' });
      expect(res.user.id).toBe('u2');
      expect(res.sessionCookie).toBe('google-token');
    });

    it('handleGoogleCallback error throws ApiError', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchResponse(false, 400, { code: 'INVALID_CODE', message: 'Invalid OAuth code', timestamp: '' }),
      );

      await expect(authApi.handleGoogleCallback({ code: 'bad' })).rejects.toThrow('Invalid OAuth code');
    });

    it('signup success and error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchResponse(true, 200, { id: 'u1', email: 'test@example.com' }),
      );

      const res = await authApi.signup({ email: 'test@example.com', password: 'pass' });
      expect(res.id).toBe('u1');

      fetchSpy.mockImplementationOnce(() =>
        mockFetchResponse(false, 400, { code: 'EMAIL_TAKEN', message: 'Email taken', timestamp: '' }),
      );
      await expect(authApi.signup({ email: 'test@example.com', password: 'pass' })).rejects.toThrow('Email taken');
    });

    it('login returns user and sessionCookie when present', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchResponse(
          true,
          200,
          { id: 'u1', email: 'test@example.com' },
          { 'set-cookie': 'FINANCEOS_SESSION=xyz123; Path=/' },
        ),
      );

      const res = await authApi.login({ email: 'test@example.com', password: 'pass' });
      expect(res.user.id).toBe('u1');
      expect(res.sessionCookie).toBe('xyz123');
    });

    it('login error handling', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchResponse(false, 401, { code: 'BAD_CREDENTIALS', message: 'Invalid credentials', timestamp: '' }),
      );

      await expect(authApi.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
    });

    it('logout, getCurrentUser, startGoogleAuth', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, {}));

      await authApi.logout();
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/logout'), expect.anything());

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'u1' }));
      const user = await authApi.getCurrentUser();
      expect(user.id).toBe('u1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { authorizationUrl: 'http://auth' }));
      const google = await authApi.startGoogleAuth();
      expect(google.authorizationUrl).toBe('http://auth');
    });

    it('handleGoogleCallback success and error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchResponse(true, 200, { id: 'u1' }, { 'set-cookie': 'FINANCEOS_SESSION=abc; Path=/' }),
      );

      const res = await authApi.handleGoogleCallback({ code: 'c1', state: 's1', error: 'e1' });
      expect(res.user.id).toBe('u1');
      expect(res.sessionCookie).toBe('abc');

      fetchSpy.mockImplementationOnce(() =>
        mockFetchResponse(false, 400, { code: 'INVALID_CODE', message: 'Bad code', timestamp: '' }),
      );
      await expect(authApi.handleGoogleCallback({ code: 'bad' })).rejects.toThrow('Bad code');
    });
  });

  describe('accountsApi', () => {
    it('list, getById, create, update, delete, getCardCycleSummary', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, [{ id: 'a1' }]));

      expect(await accountsApi.list()).toEqual([{ id: 'a1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'a1' }));
      expect(await accountsApi.getById('a1')).toEqual({ id: 'a1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 'a1' }));
      expect(await accountsApi.create({ name: 'Acc', type: 'bank_account' } as any)).toEqual({ id: 'a1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'a1' }));
      expect(await accountsApi.update('a1', { name: 'Acc2', type: 'bank_account' } as any)).toEqual({ id: 'a1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await accountsApi.delete('a1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { totalAmountDue: 500 }));
      expect(await accountsApi.getCardCycleSummary('a1')).toEqual({ totalAmountDue: 500 });
    });
  });

  describe('statementsApi', () => {
    it('listByAccount and getById', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, [{ id: 's1' }]));

      expect(await statementsApi.listByAccount('a1')).toEqual([{ id: 's1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 's1', lines: [] }));
      expect(await statementsApi.getById('s1')).toEqual({ id: 's1', lines: [] });
    });
  });

  describe('transactionsApi', () => {
    it('list, search, create, update, delete, batchReview, batchDelete', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { content: [] }));

      expect(await transactionsApi.list(0, 10, 'date,desc')).toEqual({ content: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { content: [] }));
      expect(await transactionsApi.search({ filters: [] }, 0, 10)).toEqual({ content: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 't1' }));
      expect(await transactionsApi.create({ accountId: 'a1', amount: 100 } as any)).toEqual({ id: 't1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 't1' }));
      expect(await transactionsApi.update('t1', { amount: 200 } as any)).toEqual({ id: 't1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await transactionsApi.delete('t1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { succeededIds: ['t1'], skippedIds: [], failures: [] }));
      expect(await transactionsApi.batchReview({ transactionIds: ['t1'], reviewType: 'MANUALLY_REVIEWED' })).toEqual({
        succeededIds: ['t1'],
        skippedIds: [],
        failures: [],
      });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { succeededIds: ['t1'], failures: [] }));
      expect(await transactionsApi.batchDelete({ transactionIds: ['t1'] })).toEqual({
        succeededIds: ['t1'],
        failures: [],
      });
    });
  });

  describe('investmentsApi', () => {
    it('listTransactions, createTransaction, updateTransaction, deleteTransaction, getPositions, getSummary', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { content: [] }));

      expect(await investmentsApi.listTransactions()).toEqual({ content: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 'i1' }));
      expect(await investmentsApi.createTransaction({ brokerAccountId: 'b1', instrumentId: 'inst1', type: 'buy', quantity: 10, price: 100, tradeDate: '2026-07-25' })).toEqual({ id: 'i1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'i1' }));
      expect(await investmentsApi.updateTransaction('i1', { type: 'buy', quantity: 12, price: 100, tradeDate: '2026-07-25' })).toEqual({ id: 'i1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await investmentsApi.deleteTransaction('i1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { positions: [] }));
      expect(await investmentsApi.getPositions()).toEqual({ positions: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { totalInvested: '0' }));
      expect(await investmentsApi.getSummary()).toEqual({ totalInvested: '0' });
    });
  });

  describe('gmailApi', () => {
    it('startOAuth, sync, senders CRUD, connections', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { authUrl: 'http://auth' }));

      expect(await gmailApi.startOAuth()).toEqual({ authUrl: 'http://auth' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { syncedCount: 5 }));
      expect(await gmailApi.sync()).toEqual({ syncedCount: 5 });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, [{ id: 'gs1' }]));
      expect(await gmailApi.listSenders()).toEqual([{ id: 'gs1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 'gs1' }));
      expect(await gmailApi.createSender({ email: 's@gmail.com' } as any)).toEqual({ id: 'gs1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'gs1' }));
      expect(await gmailApi.updateSender('gs1', { email: 's2@gmail.com' } as any)).toEqual({ id: 'gs1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await gmailApi.deleteSender('gs1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, [{ id: 'gc1' }]));
      expect(await gmailApi.listConnections()).toEqual([{ id: 'gc1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await gmailApi.disconnectConnection('gc1');
    });
  });

  describe('categoriesApi', () => {
    it('list, getById, create, update, delete, categorizeDescription', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, [{ id: 'c1' }]));

      expect(await categoriesApi.list()).toEqual([{ id: 'c1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'c1' }));
      expect(await categoriesApi.getById('c1')).toEqual({ id: 'c1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 'c1' }));
      expect(await categoriesApi.create({ name: 'Food' } as any)).toEqual({ id: 'c1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'c1' }));
      expect(await categoriesApi.update('c1', { name: 'Dining' } as any)).toEqual({ id: 'c1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await categoriesApi.delete('c1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { categoryId: 'c1' }));
      expect(await categoriesApi.categorizeDescription('Uber')).toEqual({ categoryId: 'c1' });
    });
  });

  describe('dashboardApi', () => {
    it('getSummary', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { totalNetWorth: 1000 }));
      expect(await dashboardApi.getSummary()).toEqual({ totalNetWorth: 1000 });
    });
  });

  describe('reportsApi', () => {
    it('getDatasource, create, list, getById, update, delete, runSaved, runAdHoc', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { fields: [] }));

      expect(await reportsApi.getDatasource()).toEqual({ fields: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 'r1' }));
      expect(await reportsApi.create({ name: 'Rep' } as any)).toEqual({ id: 'r1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, [{ id: 'r1' }]));
      expect(await reportsApi.list('TABLE')).toEqual([{ id: 'r1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'r1' }));
      expect(await reportsApi.getById('r1')).toEqual({ id: 'r1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'r1' }));
      expect(await reportsApi.update('r1', { name: 'Rep2' } as any)).toEqual({ id: 'r1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await reportsApi.delete('r1');

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { rows: [] }));
      expect(await reportsApi.runSaved('r1', { page: 1, size: 25 })).toEqual({ rows: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { rows: [] }));
      expect(await reportsApi.runAdHoc({} as any, { page: 0, size: 10 })).toEqual({ rows: [] });
    });
  });

  describe('dashboardsApi', () => {
    it('create, list, getDefault, getById, update, delete', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 201, { id: 'd1' }));

      expect(await dashboardsApi.create({ name: 'Dash' } as any)).toEqual({ id: 'd1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, [{ id: 'd1' }]));
      expect(await dashboardsApi.list()).toEqual([{ id: 'd1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'd1' }));
      expect(await dashboardsApi.getDefault()).toEqual({ id: 'd1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'd1' }));
      expect(await dashboardsApi.getById('d1')).toEqual({ id: 'd1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'd1' }));
      expect(await dashboardsApi.update('d1', { name: 'Dash2' } as any)).toEqual({ id: 'd1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await dashboardsApi.delete('d1');
    });
  });

  describe('ingestionApi and rulesApi and transactionLinksApi', () => {
    it('ingest file', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { count: 10 }));
      const form = new FormData();
      expect(await ingestionApi.ingest('a1', form)).toEqual({ count: 10 });
    });

    it('rulesApi list, create, update, verify, remove', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, { content: [] }));

      expect(await rulesApi.list({ page: 0, size: 10, sort: 'name', verified: true, search: 'test' })).toEqual({ content: [] });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 201, { id: 'ru1' }));
      expect(await rulesApi.create({ descriptionPattern: 'x' } as any)).toEqual({ id: 'ru1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'ru1' }));
      expect(await rulesApi.update('ru1', { descriptionPattern: 'y' } as any)).toEqual({ id: 'ru1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'ru1', verified: true }));
      expect(await rulesApi.verify('ru1')).toEqual({ id: 'ru1', verified: true });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await rulesApi.remove('ru1');
    });

    it('transactionLinksApi create, getById, getByTransactionId, delete', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 201, { id: 'tl1' }));

      expect(await transactionLinksApi.create({ type: 'TRANSFER', members: [] } as any)).toEqual({ id: 'tl1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { id: 'tl1' }));
      expect(await transactionLinksApi.getById('tl1')).toEqual({ id: 'tl1' });

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, [{ id: 'tl1' }]));
      expect(await transactionLinksApi.getByTransactionId('t1')).toEqual([{ id: 'tl1' }]);

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 204, ''));
      await transactionLinksApi.delete('tl1');
    });
  });

  describe('Error handling & fallback (CD-14)', () => {
    it('handles non-JSON error response from fetch gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(false, 500, 'Internal Server Error'));

      try {
        await accountsApi.list();
        expect.fail('Should have thrown ApiError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(500);
        expect(err.response.code).toBe('UNKNOWN_ERROR');
        expect(err.response.message).toBe('Request failed with status 500');
      }
    });

    it('handles empty text response as empty object', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, ''));
      const res = await accountsApi.delete('a1');
      expect(res).toEqual({});
    });

    it('covers query params for rulesApi and reportsApi list with type', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => mockFetchResponse(true, 200, [] as any));

      await reportsApi.list('TABLE');
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/v1/reports?type=TABLE'), expect.anything());

      await reportsApi.list();
      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:6969/api/v1/reports', expect.anything());

      fetchSpy.mockImplementationOnce(() => mockFetchResponse(true, 200, { rows: [] } as any));
      await reportsApi.runSaved('r1');
      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:6969/api/v1/reports/r1/data', expect.anything());

      await rulesApi.list();
      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:6969/api/v1/rules?', expect.anything());

      await rulesApi.list({ page: 1, size: 10, sort: 'name,asc', verified: true, search: 'test' });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('page=1&size=10&sort=name%2Casc&verified=true&search=test'),
        expect.anything(),
      );
    });
  });
});
