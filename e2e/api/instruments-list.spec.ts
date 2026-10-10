// GET /instruments answers one page with the total ({items, page, size, totalElements, totalPages}),
// sorted by the name the caller sees (sort=name[,asc|desc], default name,asc; any other key is a 400).
// Search, the type filter, the sort and the count all use the caller's own name and type; search also
// matches the Yahoo symbol.

import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { generateIsin, generateYahooSymbol, resolveInstrument, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

type Query = { search?: string; type?: 'stock' | 'mutual_fund' | 'etf'; sort?: string; page?: number; size?: number };

async function list(api: ApiClient, query: Query) {
  const res = await api.GET('/api/v1/instruments', { params: { query } });
  expectStatus(res, 200);
  return res.data!;
}

const names = (page: { items: { name: string }[] }) => page.items.map((i) => i.name);

test.describe('Instruments list: total, sort and search (@api)', () => {
  test('answers a page with the total; sorts by name both ways, case-insensitively; pages past the end are empty', async ({
    api,
  }) => {
    const tag = `LST${uniqueSeedSuffix()}`;
    // Created out of order, one lower-case: the order is by name, ignoring case.
    for (const name of [`Zulu ${tag}`, `alpha ${tag}`, `Mike ${tag}`]) {
      await resolveInstrument(api, { type: 'stock', name, isin: generateIsin() });
    }
    const asc = [`alpha ${tag}`, `Mike ${tag}`, `Zulu ${tag}`];

    const first = await list(api, { search: tag });
    expect(names(first)).toEqual(asc);
    expect(first).toMatchObject({ page: 0, size: 50, totalElements: 3, totalPages: 1 });

    expect(names(await list(api, { search: tag, sort: 'name' }))).toEqual(asc);
    expect(names(await list(api, { search: tag, sort: 'name,asc' }))).toEqual(asc);
    expect(names(await list(api, { search: tag, sort: 'name,desc' }))).toEqual([...asc].reverse());

    // Paging keeps the order and the total.
    const p0 = await list(api, { search: tag, size: 2, page: 0 });
    expect(names(p0)).toEqual(asc.slice(0, 2));
    expect(p0).toMatchObject({ page: 0, size: 2, totalElements: 3, totalPages: 2 });
    const p1 = await list(api, { search: tag, size: 2, page: 1 });
    expect(names(p1)).toEqual(asc.slice(2));
    expect(p1).toMatchObject({ page: 1, totalElements: 3, totalPages: 2 });
    const desc1 = await list(api, { search: tag, size: 2, page: 1, sort: 'name,desc' });
    expect(names(desc1)).toEqual([asc[0]]);
    const past = await list(api, { search: tag, size: 2, page: 5 });
    expect(past.items).toEqual([]);
    expect(past.totalElements).toBe(3);

    // A blank search is paged too, with the catalog total.
    const all = await list(api, { size: 1 });
    expect(all.items).toHaveLength(1);
    expect(all.totalElements).toBeGreaterThanOrEqual(3);
  });

  test('any sort key other than name, or a direction other than asc / desc, is a 400', async ({ api }) => {
    for (const sort of ['price', 'symbol,asc', 'createdAt,desc', 'name,sideways']) {
      const res = await api.GET('/api/v1/instruments', { params: { query: { sort } } });
      expectStatus(res, 400);
    }
  });

  test('search matches the Yahoo symbol', async ({ api }) => {
    const yahoo = generateYahooSymbol('YHS');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Yahoo Only ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: generateYahooSymbol('TKR').replace('.NS', ''),
      exchange: 'NSE',
      yahooSymbol: yahoo,
    });
    expect(inst.symbol).not.toBe(yahoo);

    const hit = await list(api, { search: yahoo });
    expect(hit.items.map((i) => i.id)).toEqual([inst.id]);
    expect(hit.totalElements).toBe(1);
    // Case-insensitive and partial (without the exchange suffix).
    const partial = await list(api, { search: yahoo.replace('.NS', '').toLowerCase() });
    expect(partial.items.map((i) => i.id)).toContain(inst.id);
  });

  test('search, type filter, sort and count use the caller\'s own name and type; another user sees the catalog', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-list-b');
    const tag = `OWN${uniqueSeedSuffix()}`;
    const created = [];
    for (const name of [`Bravo ${tag}`, `Charlie ${tag}`, `Delta ${tag}`]) {
      created.push(await resolveInstrument(api, { type: 'stock', name, isin: generateIsin() }));
    }
    const [bravo, charlie, delta] = created;

    // A renames Delta to sort first and retypes Charlie to an ETF, for A only.
    const rename = await api.PUT('/api/v1/instruments/{id}', {
      params: { path: { id: delta.id } },
      body: { type: 'stock', name: `Able ${tag}`, isin: delta.isin ?? undefined, currency: delta.currency },
    });
    expectStatus(rename, 200);
    const retype = await api.PUT('/api/v1/instruments/{id}', {
      params: { path: { id: charlie.id } },
      body: { type: 'etf', name: charlie.name, isin: charlie.isin ?? undefined, currency: charlie.currency },
    });
    expectStatus(retype, 200);

    // A: sorted by A's names, counted by A's types.
    expect(names(await list(api, { search: tag }))).toEqual([`Able ${tag}`, `Bravo ${tag}`, `Charlie ${tag}`]);
    expect(names(await list(api, { search: tag, sort: 'name,desc' }))).toEqual([
      `Charlie ${tag}`,
      `Bravo ${tag}`,
      `Able ${tag}`,
    ]);
    const aStocks = await list(api, { search: tag, type: 'stock' });
    expect(aStocks.items.map((i) => i.id)).toEqual([delta.id, bravo.id]);
    expect(aStocks.totalElements).toBe(2);
    const aEtfs = await list(api, { search: tag, type: 'etf' });
    expect(aEtfs.items.map((i) => i.id)).toEqual([charlie.id]);
    expect(aEtfs.totalElements).toBe(1);
    // A finds Delta by the name A gave it.
    expect((await list(api, { search: `Able ${tag}` })).items.map((i) => i.id)).toEqual([delta.id]);

    // B: the catalog names and types.
    expect(names(await list(apiB, { search: tag }))).toEqual([`Bravo ${tag}`, `Charlie ${tag}`, `Delta ${tag}`]);
    const bStocks = await list(apiB, { search: tag, type: 'stock' });
    expect(bStocks.totalElements).toBe(3);
    expect((await list(apiB, { search: tag, type: 'etf' })).totalElements).toBe(0);
    expect((await list(apiB, { search: `Able ${tag}` })).totalElements).toBe(0);
  });
});
