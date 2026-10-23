import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { corporateActionsApi, dividendsApi, fnoApi, instrumentsApi, investmentsApi } from '@/lib/apiClient';

describe('investments API client', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  function reply(body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }, raw = false) {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(raw ? (body as string) : JSON.stringify(body), { status: 200, headers }),
    );
  }

  const lastRequest = () => {
    const arg = fetchSpy.mock.calls[0][0] as Request;
    return { url: new URL(arg.url), method: arg.method };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getHoldings sends the filters, sort and page and returns the body', async () => {
    const body = { header: {}, groups: [], holdings: [], page: 1, size: 50, totalElements: 0, totalPages: 0 };
    reply(body);
    const result = await investmentsApi.getHoldings({ brokerAccountId: 'b1', assetType: 'etf', search: 'gold', sort: 'return_pct', page: 1 });
    expect(result).toEqual(body);
    const { url } = lastRequest();
    expect(url.pathname).toBe('/api/v1/investments/holdings');
    expect(Object.fromEntries(url.searchParams)).toEqual({ brokerAccountId: 'b1', assetType: 'etf', search: 'gold', sort: 'return_pct', page: '1', size: '50' });
  });

  it('getHolding and getSellEstimate address the instrument; no quantity = no query', async () => {
    reply({ instrumentId: 'i1' });
    await investmentsApi.getHolding('i1');
    expect(lastRequest().url.pathname).toBe('/api/v1/investments/holdings/i1');
    reply({ instrumentId: 'i1' });
    await investmentsApi.getSellEstimate('i1');
    expect(lastRequest().url.pathname).toBe('/api/v1/investments/holdings/i1/sell-estimate');
    expect(lastRequest().url.search).toBe('');
    reply({ instrumentId: 'i1' });
    await investmentsApi.getSellEstimate('i1', 20);
    expect(lastRequest().url.searchParams.get('quantity')).toBe('20');
  });

  it('getTrades forwards the new type and fy filters', async () => {
    reply({ content: [] });
    await investmentsApi.getTrades({ type: 'sell', fy: 2026, instrumentId: 'i1' });
    const q = lastRequest().url.searchParams;
    expect(q.get('type')).toBe('sell');
    expect(q.get('fy')).toBe('2026');
    expect(q.get('instrumentId')).toBe('i1');
  });

  it('dividends: fy on the list, summary and receipts summary; by-instrument pages', async () => {
    reply({ content: [] });
    await dividendsApi.list({ fy: 2026, instrumentId: 'i1', page: 2, size: 10 });
    expect(lastRequest().url.searchParams.get('fy')).toBe('2026');
    reply({ buckets: [] });
    await dividendsApi.summary({ fy: 2026 });
    expect(lastRequest().url.searchParams.get('fy')).toBe('2026');
    reply({ buckets: [] });
    await dividendsApi.receiptSummary({ fy: 2025 });
    expect(lastRequest().url.searchParams.get('fy')).toBe('2025');
    reply({ items: [] });
    await dividendsApi.byInstrument({ years: 3, page: 1, size: 5 });
    const { url } = lastRequest();
    expect(url.pathname).toBe('/api/v1/investments/dividends/by-instrument');
    expect(Object.fromEntries(url.searchParams)).toEqual({ years: '3', page: '1', size: '5' });
  });

  it('dividends exportCsv returns the text and the server file name, with the list filters', async () => {
    reply('a,b\n1,2\n', { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="dividends-fy2026.csv"' }, true);
    const result = await dividendsApi.exportCsv({ fy: 2026, receipt: 'overdue' });
    expect(result).toEqual({ csv: 'a,b\n1,2\n', filename: 'dividends-fy2026.csv' });
    const { url } = lastRequest();
    expect(url.pathname).toBe('/api/v1/investments/dividends/export.csv');
    expect(url.searchParams.get('receipt')).toBe('overdue');
  });

  it('F&O: page, summary and CSV', async () => {
    reply({ content: [] });
    await fnoApi.page({ fy: 2026, optionType: 'CE', underlying: 'NIFTY', sort: 'pnl_desc', brokerAccountId: 'b1' });
    let { url } = lastRequest();
    expect(url.pathname).toBe('/api/v1/investments/fno/page');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ fy: '2026', optionType: 'CE', underlying: 'NIFTY', sort: 'pnl_desc', brokerAccountId: 'b1' });
    reply({ fy: 2026 });
    await fnoApi.summary({ fy: 2026, brokerAccountId: 'b1' });
    ({ url } = lastRequest());
    expect(url.pathname).toBe('/api/v1/investments/fno/summary');
    expect(url.searchParams.get('brokerAccountId')).toBe('b1');
    reply('x', { 'Content-Type': 'text/csv' }, true);
    const csv = await fnoApi.exportCsv(2026);
    expect(csv).toEqual({ csv: 'x', filename: 'fno.csv' });
    expect(lastRequest().url.searchParams.get('fy')).toBe('2026');
  });

  it('corporate actions: the page and the preview POST', async () => {
    reply({ items: [] });
    await corporateActionsApi.page({ type: 'merger', search: 'hdfc', sort: 'name', page: 1, size: 10 });
    let { url } = lastRequest();
    expect(url.pathname).toBe('/api/v1/corporate-actions/page');
    expect(Object.fromEntries(url.searchParams)).toEqual({ type: 'merger', search: 'hdfc', sort: 'name', page: '1', size: '10' });
    reply({ holdings: [] });
    await corporateActionsApi.preview('i1', { type: 'bonus', ratioFrom: 1, ratioTo: 1 } as never);
    const request = lastRequest();
    url = request.url;
    expect(request.method).toBe('POST');
    expect(url.pathname).toBe('/api/v1/instruments/i1/corporate-actions/preview');
  });

  it('instruments: stale and held filters and the prices page', async () => {
    reply({ items: [] });
    await instrumentsApi.list({ stale: true, held: false, page: 0, size: 25 });
    const q = lastRequest().url.searchParams;
    expect(q.get('stale')).toBe('true');
    expect(q.get('held')).toBe('false');
    reply({ items: [] });
    await instrumentsApi.pricesPage('i1', { page: 2, size: 10 });
    const { url } = lastRequest();
    expect(url.pathname).toBe('/api/v1/instruments/i1/prices/page');
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: '2', size: '10' });
  });
});
