import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billsApi, dashboardsApi, inboxApi, obligationsApi } from '@/lib/apiClient';

describe('apiClient navigation helpers', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const lastRequest = async () => {
    const arg = fetchSpy.mock.calls.at(-1)![0] as Request | string;
    const init = fetchSpy.mock.calls.at(-1)![1] as RequestInit | undefined;
    if (typeof arg === 'string') return { url: new URL(arg), method: init?.method ?? 'GET', body: init?.body as string | undefined };
    const body = arg.method === 'GET' ? undefined : await arg.clone().text();
    return { url: new URL(arg.url), method: arg.method, body };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({}));
  });

  describe('dashboardsApi', () => {
    it('builtins GETs the catalog and returns it', async () => {
      fetchSpy.mockResolvedValueOnce(json([{ key: 'net_worth' }]));
      expect(await dashboardsApi.builtins()).toEqual([{ key: 'net_worth' }]);
      const r = await lastRequest();
      expect(r.method).toBe('GET');
      expect(r.url.pathname).toBe('/api/v1/dashboards/builtins');
    });

    it('builtins returns [] when the body is empty', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      expect(await dashboardsApi.builtins()).toEqual([]);
    });

    it('builtinData POSTs params with the key in the path and page/size in the query', async () => {
      await dashboardsApi.builtinData('upcoming', { days: 14 }, { page: 2, size: 25 });
      const r = await lastRequest();
      expect(r.method).toBe('POST');
      expect(r.url.pathname).toBe('/api/v1/dashboards/builtins/upcoming/data');
      expect(r.url.searchParams.get('page')).toBe('2');
      expect(r.url.searchParams.get('size')).toBe('25');
      expect(JSON.parse(r.body!)).toEqual({ params: { days: 14 } });
    });

    it('builtinData sends {params:{}} for null params and omits page/size when no options', async () => {
      await dashboardsApi.builtinData('net_worth', null);
      const r = await lastRequest();
      expect(JSON.parse(r.body!)).toEqual({ params: {} });
      expect(r.url.searchParams.has('page')).toBe(false);
      expect(r.url.searchParams.has('size')).toBe(false);
    });

    it('builtinData sends {params:{}} for undefined params', async () => {
      await dashboardsApi.builtinData('net_worth', undefined, {});
      expect(JSON.parse((await lastRequest()).body!)).toEqual({ params: {} });
    });

    it('restoreHome POSTs /dashboards/home/restore and returns the dashboard', async () => {
      fetchSpy.mockResolvedValueOnce(json({ id: 'home', name: 'Home' }));
      expect(await dashboardsApi.restoreHome()).toEqual({ id: 'home', name: 'Home' });
      const r = await lastRequest();
      expect(r.method).toBe('POST');
      expect(r.url.pathname).toBe('/api/v1/dashboards/home/restore');
    });
  });

  describe('inboxApi', () => {
    it('list GETs /inbox', async () => {
      fetchSpy.mockResolvedValueOnce(json({ items: [], summary: { total: 0 } }));
      expect(await inboxApi.list()).toEqual({ items: [], summary: { total: 0 } });
      const r = await lastRequest();
      expect(r.method).toBe('GET');
      expect(r.url.pathname).toBe('/api/v1/inbox');
    });

    it('summary GETs /inbox/summary', async () => {
      fetchSpy.mockResolvedValueOnce(json({ total: 3 }));
      expect(await inboxApi.summary()).toEqual({ total: 3 });
      expect((await lastRequest()).url.pathname).toBe('/api/v1/inbox/summary');
    });
  });

  describe('billsApi.list', () => {
    it('sends accountId in the query when given', async () => {
      fetchSpy.mockResolvedValueOnce(json([{ statementId: 's1' }]));
      expect(await billsApi.list('acc-1')).toEqual([{ statementId: 's1' }]);
      const r = await lastRequest();
      expect(r.url.pathname).toBe('/api/v1/bills');
      expect(r.url.searchParams.get('accountId')).toBe('acc-1');
    });

    it.each([[undefined], [null]])('omits accountId when %s', async (v) => {
      await billsApi.list(v);
      expect((await lastRequest()).url.searchParams.has('accountId')).toBe(false);
    });

    it('returns [] for an empty body', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      expect(await billsApi.list()).toEqual([]);
    });
  });

  describe('obligationsApi.getUpcoming', () => {
    it('sends months and joins kinds with a comma', async () => {
      await obligationsApi.getUpcoming(3, ['EMI', 'CARD_BILL']);
      const r = await lastRequest();
      expect(r.url.pathname).toBe('/api/v1/obligations/upcoming');
      expect(r.url.searchParams.get('months')).toBe('3');
      expect(r.url.searchParams.get('kinds')).toBe('EMI,CARD_BILL');
    });

    it('a single kind is sent unjoined', async () => {
      await obligationsApi.getUpcoming(1, ['EMI']);
      expect((await lastRequest()).url.searchParams.get('kinds')).toBe('EMI');
    });

    it('omits kinds when the list is empty or undefined', async () => {
      await obligationsApi.getUpcoming(3, []);
      expect((await lastRequest()).url.searchParams.has('kinds')).toBe(false);
      await obligationsApi.getUpcoming(3);
      expect((await lastRequest()).url.searchParams.has('kinds')).toBe(false);
    });

    it('omits months when not given', async () => {
      await obligationsApi.getUpcoming();
      expect((await lastRequest()).url.searchParams.has('months')).toBe(false);
    });
  });
});
