import { describe, expect, it } from 'vitest';

import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import { pinClock } from '@/test/pinClock';

import { groups, header, holdingRow } from './holdings.fixtures';
import {
  allocationModel,
  groupBands,
  heroModel,
  holdingListRow,
  holdingsQuery,
  holdingsUrl,
  isListedHolding,
  moversFromResponse,
  parseHoldingsUrl,
  SORT_OPTIONS,
  sortFromValue,
  sortValue,
  taxCardModel,
  topMovers,
} from './holdingsModel';

pinClock();

describe('Holdings URL state', () => {
  it('reads defaults from an empty query', () => {
    expect(parseHoldingsUrl({})).toEqual({ q: '', type: '', broker: '', sort: 'name', dir: 'asc' });
  });

  it('reads every filter and ignores values it does not know', () => {
    expect(parseHoldingsUrl({ q: ' tcs ', type: 'etf', broker: 'b1', sort: 'return_abs', page: '3', size: '25' })).toEqual({
      q: 'tcs',
      type: 'etf',
      broker: 'b1',
      sort: 'return_abs',
      dir: 'desc',
    });
    expect(parseHoldingsUrl({ type: 'bond', sort: 'dividend', page: '-1', size: '7' })).toEqual({
      q: '',
      type: '',
      broker: '',
      sort: 'name',
      dir: 'asc',
    });
  });

  it('keeps defaults out of the address', () => {
    expect(holdingsUrl(parseHoldingsUrl({}))).toBe('/investments/holdings');
    expect(holdingsUrl({ q: 'tcs', type: 'stock', broker: 'b1', sort: 'return_pct', dir: 'desc' })).toBe(
      '/investments/holdings?q=tcs&type=stock&broker=b1&sort=return_pct',
    );
  });

  it('turns the state into the server request', () => {
    expect(holdingsQuery({ q: 'tcs', type: 'mutual_fund', broker: 'b1', sort: 'return_pct', dir: 'desc' })).toEqual({
      search: 'tcs',
      assetType: 'mutual_fund',
      brokerAccountId: 'b1',
      sort: 'return_pct',
    });
    expect(holdingsQuery(parseHoldingsUrl({}))).toMatchObject({ search: undefined, assetType: undefined, brokerAccountId: undefined, sort: 'name' });
  });
});

describe('Holdings sort direction', () => {
  it('defaults each key to its own order: name A to Z, returns high to low', () => {
    expect(parseHoldingsUrl({ sort: 'name' }).dir).toBe('asc');
    expect(parseHoldingsUrl({ sort: 'return_pct' }).dir).toBe('desc');
    expect(parseHoldingsUrl({ sort: 'return_abs' }).dir).toBe('desc');
  });

  it('reads dir case-sensitively as asc or desc and falls back to the default for anything else', () => {
    expect(parseHoldingsUrl({ sort: 'name', dir: 'desc' }).dir).toBe('desc');
    expect(parseHoldingsUrl({ sort: 'return_pct', dir: 'asc' }).dir).toBe('asc');
    expect(parseHoldingsUrl({ sort: 'return_pct', dir: 'up' }).dir).toBe('desc');
    expect(parseHoldingsUrl({ dir: 'sideways' }).dir).toBe('asc');
  });

  it('writes dir to the address only when it differs from the key default', () => {
    expect(holdingsUrl(parseHoldingsUrl({ sort: 'name', dir: 'asc' }))).toBe('/investments/holdings');
    expect(holdingsUrl(parseHoldingsUrl({ sort: 'name', dir: 'desc' }))).toBe('/investments/holdings?dir=desc');
    expect(holdingsUrl(parseHoldingsUrl({ sort: 'return_pct', dir: 'desc' }))).toBe('/investments/holdings?sort=return_pct');
    expect(holdingsUrl(parseHoldingsUrl({ sort: 'return_abs', dir: 'asc' }))).toBe('/investments/holdings?sort=return_abs&dir=asc');
  });

  it('sends dir to the server only when it differs from the key default', () => {
    expect(holdingsQuery(parseHoldingsUrl({ sort: 'name' })).dir).toBeUndefined();
    expect(holdingsQuery(parseHoldingsUrl({ sort: 'return_pct' })).dir).toBeUndefined();
    expect(holdingsQuery(parseHoldingsUrl({ sort: 'name', dir: 'desc' }))).toMatchObject({ sort: 'name', dir: 'desc' });
    expect(holdingsQuery(parseHoldingsUrl({ sort: 'return_abs', dir: 'asc' }))).toMatchObject({ sort: 'return_abs', dir: 'asc' });
  });

  it('offers six options, each with its direction in words', () => {
    expect(SORT_OPTIONS.map((o) => o.label)).toEqual([
      'Name A–Z',
      'Name Z–A',
      'Best % return',
      'Worst % return',
      'Best ₹ return',
      'Worst ₹ return',
    ]);
  });

  it('maps every option to its sort and dir and back', () => {
    for (const o of SORT_OPTIONS) {
      expect(sortFromValue(o.value)).toEqual({ sort: o.sort, dir: o.dir });
      expect(sortValue({ sort: o.sort, dir: o.dir })).toBe(o.value);
    }
    expect(sortFromValue('nonsense')).toEqual({ sort: 'name', dir: 'asc' });
  });
});

describe('heroModel', () => {
  it('writes the value, today, and the two figures with their sub line', () => {
    const hero = heroModel(header);
    expect(hero.value).toBe('₹6,38,208');
    expect(hero.day).toEqual({ text: '+₹3,566 today · +0.56%', tone: 'positive' });
    expect(hero.invested).toBe('₹4,93,299');
    expect(hero.unrealised).toEqual({ text: '+₹1,44,909', tone: 'positive' });
    expect(hero.unrealisedSub).toBe('+29.4% · XIRR 24.1%');
    expect(hero.priceAsOf).toBe('13 Oct');
  });

  it('drops the day line when no price moved and the sub line parts that are missing', () => {
    const hero = heroModel({ ...header, dayChange: null, dayChangePct: null, xirr: null, unrealisedPct: null, priceAsOf: null });
    expect(hero.day).toBeNull();
    expect(hero.unrealisedSub).toBeNull();
    expect(hero.priceAsOf).toBeNull();
  });
});

describe('holdingListRow', () => {
  it('writes a priced stock: caption, LTP, day move and P&L', () => {
    const row = holdingListRow(holdingRow());
    expect(row.title).toBe('HDFCBANK');
    expect(row.name).toBe('HDFC Bank');
    expect(row.phone.caption).toBe('40 qty · avg ₹1,580.00');
    expect(row.dayPct).toEqual({ text: '−0.3%', tone: 'danger' });
    expect(row.pnl).toEqual({ amount: '+₹6,504', plain: '+6,504', pct: '+10.3%', tone: 'positive' });
    // The desktop columns carry no ₹.
    expect([row.avgCost, row.ltp, row.invested, row.currentPlain]).toEqual(['1,580.00', '1,742.60', '63,200', '69,704']);
    expect(row.href).toBe('/investments/i-hdfcbank');
  });

  it('writes a fund by its name with units', () => {
    const row = holdingListRow(holdingRow({ symbol: null, name: 'Mirae Asset Large Cap', assetType: 'mutual_fund', quantity: 325.11, ltp: 118.62 }));
    expect(row.title).toBe('Mirae Asset Large Cap');
    expect(row.name).toBeNull();
    expect(row.phone.caption).toBe('325.11 units · avg ₹1,580.00');
  });

  it('marks a manual price and shows no day move for it', () => {
    const row = holdingListRow(holdingRow({ manualPrice: true, dayChangePct: 1.2 }));
    expect(row.manualPrice).toBe(true);
    expect(row.dayPct).toBeNull();
  });

  it('values a holding without a price at cost, with no LTP and no P&L', () => {
    const row = holdingListRow(holdingRow({ noPrice: true, ltp: null, quantity: 100, avgCost: 45, currentValue: 4500, unrealised: 0, unrealisedPct: null }));
    expect(row.noPrice).toBe(true);
    expect(row.ltp).toBeNull();
    expect(row.pnl).toBeNull();
    expect(row.phone.caption).toBe('100 qty · avg ₹45.00');
    expect(row.current).toBe('₹4,500');
  });

  it('does not list a holding merged out entirely', () => {
    expect(isListedHolding(holdingRow({ quantity: 0, mergedIntoName: 'HDFCBANK', mergedIntoDate: '2023-07-13' }))).toBe(false);
    expect(isListedHolding(holdingRow({ quantity: 0, mergedIntoName: null }))).toBe(true);
    expect(isListedHolding(holdingRow({ quantity: 5, mergedIntoName: 'HDFCBANK' }))).toBe(true);
  });
});

describe('groups and allocation', () => {
  it('gives each asset type its name, total and share of the value', () => {
    const bands = groupBands(groups);
    expect(bands.get('stock')).toMatchObject({ name: 'Stocks', total: '₹4,01,290', share: '63%' });
    expect(bands.get('mutual_fund')).toMatchObject({ name: 'Mutual funds', share: '31%' });
    expect(bands.get('etf')).toMatchObject({ name: 'ETFs', share: '6%' });
  });

  it('splits the bar by value, with the share in each label', () => {
    expect(allocationModel(groups)).toEqual([
      { value: 401290, label: 'Stocks 63%', color: 'chart-1' },
      { value: 196268, label: 'Mutual funds 31%', color: 'chart-2' },
      { value: 40650, label: 'ETFs 6%', color: 'chart-3' },
    ]);
    expect(allocationModel([{ assetType: 'stock', value: 0, count: 0 }])).toEqual([]);
  });
});

const tax = {
  fy: 2026,
  fyStart: '2026-04-01',
  fyEnd: '2027-03-31',
  realised: { ltcg: 2425, ltcl: 0, stcg: 0, stcl: 13500, exemptionLeft: 122575 },
  summary: { harvestableLtcg: 98222, harvestableLosses: { total: 13500, longTerm: 0, shortTerm: 13500 } },
  openLots: {
    items: [
      { instrument: 'INFY', term: 'long', taxClass: 'EQUITY_ORIENTED', gain: 48162 },
      { instrument: 'INFY', term: 'long', taxClass: 'EQUITY_ORIENTED', gain: 100 },
      { instrument: 'ITC', term: 'long', taxClass: 'EQUITY_ORIENTED', gain: 50060 },
      { instrument: 'RELIANCE', term: 'short', taxClass: 'EQUITY_ORIENTED', gain: 11062 },
      { instrument: 'TATAMOTORS', term: 'short', taxClass: 'EQUITY_ORIENTED', gain: -13500 },
    ],
  },
} as unknown as TaxHarvestResponse;

describe('Tax this FY', () => {
  it('lists realised gains, the exemption left, harvestable gains with their symbols and the loss to offset', () => {
    expect(taxCardModel(tax)).toEqual({
      fy: 'FY 26-27',
      rows: [
        { label: 'Realised gains', value: '−₹11,075' },
        { label: 'LTCG exemption left', value: '₹1,22,575' },
        { label: 'Harvestable gains', sub: 'INFY, ITC', value: '₹98,222' },
        { label: 'Loss to offset', sub: 'TATAMOTORS', value: '−₹13,500', tone: 'danger' },
      ],
    });
  });

  it('leaves out the loss row when there is none and the harvest rows when the summary is missing', () => {
    const noLoss = { ...tax, summary: { ...tax.summary!, harvestableLosses: { total: 0, longTerm: 0, shortTerm: 0 } } } as TaxHarvestResponse;
    expect(taxCardModel(noLoss).rows.map((r) => r.label)).toEqual(['Realised gains', 'LTCG exemption left', 'Harvestable gains']);
    const noSummary = { ...tax, summary: undefined } as TaxHarvestResponse;
    expect(taxCardModel(noSummary).rows.map((r) => r.label)).toEqual(['Realised gains', 'LTCG exemption left']);
  });
});

describe('topMovers', () => {
  it('takes the three biggest moves in rupees, up or down, and skips merged and unmoved holdings', () => {
    const rows = [
      holdingRow({ instrumentId: 'a', symbol: 'INFY', dayChange: 1860 }),
      holdingRow({ instrumentId: 'b', symbol: 'RELIANCE', dayChange: 1230 }),
      holdingRow({ instrumentId: 'c', symbol: 'TCS', dayChange: -280 }),
      holdingRow({ instrumentId: 'd', symbol: 'ITC', dayChange: 40 }),
      holdingRow({ instrumentId: 'e', symbol: 'FLAT', dayChange: 0 }),
      holdingRow({ instrumentId: 'f', symbol: 'HDFC', dayChange: 9999, mergedIntoName: 'HDFCBANK' }),
      holdingRow({ instrumentId: 'g', symbol: 'NODAY', dayChange: null }),
    ];
    expect(topMovers(rows)).toEqual([
      { id: 'a', symbol: 'INFY', amount: '+₹1,860', tone: 'positive' },
      { id: 'b', symbol: 'RELIANCE', amount: '+₹1,230', tone: 'positive' },
      { id: 'c', symbol: 'TCS', amount: '−₹280', tone: 'danger' },
    ]);
  });
});

describe('moversFromResponse', () => {
  it("shows the server's movers in order, falling back to the name when there is no symbol", () => {
    expect(
      moversFromResponse([
        { instrumentId: 'a', symbol: 'INFY', name: 'Infosys', dayChange: 1860 },
        { instrumentId: 'b', symbol: null, name: 'Parag Parikh Flexi', dayChange: -280 },
      ]),
    ).toEqual([
      { id: 'a', symbol: 'INFY', amount: '+₹1,860', tone: 'positive' },
      { id: 'b', symbol: 'Parag Parikh Flexi', amount: '−₹280', tone: 'danger' },
    ]);
  });
});

describe('holdingListRow phone lines', () => {
  it('writes a stock: qty and avg, return %, return amount, invested, LTP and day %', () => {
    const { phone } = holdingListRow(holdingRow());
    expect(phone.caption).toBe('40 qty · avg ₹1,580.00');
    expect(phone.returnPct).toEqual({ text: '+10.3%', tone: 'positive' });
    expect(phone.returnAmount).toEqual({ text: '+₹6,504', tone: 'positive' });
    expect(phone.invested).toBe('Invested ₹63,200');
    expect(phone.ltp).toEqual({ text: 'LTP ₹1,742.60', dayPct: { text: '−0.3%', tone: 'danger' } });
    expect(phone.note).toBeNull();
  });

  it('shows paise on single amounts and colours a loss', () => {
    const { phone } = holdingListRow(holdingRow({ invested: 3396.05, unrealised: -2237.5, unrealisedPct: -65.89 }));
    expect(phone.invested).toBe('Invested ₹3,396.05');
    expect(phone.returnAmount).toEqual({ text: '−₹2,237.50', tone: 'danger' });
    expect(phone.returnPct).toEqual({ text: '−65.9%', tone: 'danger' });
  });

  it('says units for a fund', () => {
    const { phone } = holdingListRow(holdingRow({ symbol: null, name: 'Mirae Asset Large Cap', assetType: 'mutual_fund', quantity: 12.345, avgCost: 45.67 }));
    expect(phone.caption).toBe('12.345 units · avg ₹45.67');
  });

  it('adds "manual price" after the LTP and has no day %', () => {
    const { phone } = holdingListRow(holdingRow({ manualPrice: true, dayChangePct: 1.2 }));
    expect(phone.ltp).toEqual({ text: 'LTP ₹1,742.60 · manual price', dayPct: null });
  });

  it('has no day % for a price without a day change', () => {
    const { phone } = holdingListRow(holdingRow({ dayChangePct: null }));
    expect(phone.ltp).toEqual({ text: 'LTP ₹1,742.60', dayPct: null });
  });

  it('shows the no-price note in place of the LTP and no return', () => {
    const { phone } = holdingListRow(holdingRow({ noPrice: true, ltp: null, unrealised: 0, unrealisedPct: null }));
    expect(phone.ltp).toEqual({ text: 'at cost (no price)', dayPct: null });
    expect(phone.returnPct).toBeNull();
    expect(phone.returnAmount).toBeNull();
    expect(phone.invested).toBe('Invested ₹63,200');
  });

  it('keeps a delisted note under the ticker beside its LTP', () => {
    const { phone } = holdingListRow(holdingRow({ delisted: true, ltp: 0 }));
    expect(phone.note).toBe('Delisted');
    expect(phone.ltp?.text).toBe('LTP ₹0.00');
  });
});

describe('holdingListRow phone title', () => {
  it('shows the ticker for a stock and the name for a fund whose symbol is an ISIN', () => {
    expect(holdingListRow(holdingRow()).phone.title).toBe('HDFCBANK');
    const fund = holdingListRow(holdingRow({ symbol: 'INF100E2E001', name: 'E2E Bluechip', assetType: 'mutual_fund' }));
    expect(fund.title).toBe('INF100E2E001');
    expect(fund.phone.title).toBe('E2E Bluechip');
  });
});
