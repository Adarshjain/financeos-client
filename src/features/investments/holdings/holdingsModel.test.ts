import { describe, expect, it } from 'vitest';

import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';

import { groups, header, holdingRow } from './holdings.fixtures';
import {
  allocationModel,
  groupBands,
  heroModel,
  holdingListRow,
  holdingsQuery,
  holdingsTiles,
  holdingsUrl,
  mergedLine,
  parseHoldingsUrl,
  taxCardModel,
  topMovers,
} from './holdingsModel';

describe('Holdings URL state', () => {
  it('reads defaults from an empty query', () => {
    expect(parseHoldingsUrl({})).toEqual({ q: '', type: '', broker: '', sort: 'name', page: 0, size: 50 });
  });

  it('reads every filter and ignores values it does not know', () => {
    expect(parseHoldingsUrl({ q: ' tcs ', type: 'etf', broker: 'b1', sort: 'return_abs', page: '2', size: '25' })).toEqual({
      q: 'tcs',
      type: 'etf',
      broker: 'b1',
      sort: 'return_abs',
      page: 2,
      size: 25,
    });
    expect(parseHoldingsUrl({ type: 'bond', sort: 'dividend', page: '-1', size: '7' })).toEqual({
      q: '',
      type: '',
      broker: '',
      sort: 'name',
      page: 0,
      size: 50,
    });
  });

  it('keeps defaults out of the address', () => {
    expect(holdingsUrl(parseHoldingsUrl({}))).toBe('/ds/investments');
    expect(holdingsUrl({ q: 'tcs', type: 'stock', broker: 'b1', sort: 'return_pct', page: 1, size: 25 })).toBe(
      '/ds/investments?q=tcs&type=stock&broker=b1&sort=return_pct&page=1&size=25',
    );
  });

  it('turns the state into the server request', () => {
    expect(holdingsQuery({ q: 'tcs', type: 'mutual_fund', broker: 'b1', sort: 'return_pct', page: 1, size: 25 })).toEqual({
      search: 'tcs',
      assetType: 'mutual_fund',
      brokerAccountId: 'b1',
      sort: 'return_pct',
      page: 1,
      size: 25,
    });
    expect(holdingsQuery(parseHoldingsUrl({}))).toMatchObject({ search: undefined, assetType: undefined, brokerAccountId: undefined, sort: 'name' });
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
  it('writes a priced stock: position, LTP, day move and P&L', () => {
    const row = holdingListRow(holdingRow());
    expect(row.title).toBe('HDFCBANK');
    expect(row.name).toBe('HDFC Bank');
    expect(row.position).toBe('40 × ₹1,742.60');
    expect(row.dayPct).toEqual({ text: '−0.3%', tone: 'danger' });
    expect(row.pnl).toEqual({ amount: '+₹6,504', plain: '+6,504', pct: '+10.3%', tone: 'positive' });
    // The desktop columns carry no ₹.
    expect([row.avgCost, row.ltp, row.invested, row.currentPlain]).toEqual(['1,580.00', '1,742.60', '63,200', '69,704']);
    expect(row.href).toBe('/ds/investments/i-hdfcbank');
  });

  it('writes a fund by its name with units', () => {
    const row = holdingListRow(holdingRow({ symbol: null, name: 'Mirae Asset Large Cap', assetType: 'mutual_fund', quantity: 325.11, ltp: 118.62 }));
    expect(row.title).toBe('Mirae Asset Large Cap');
    expect(row.name).toBeNull();
    expect(row.position).toBe('325.11 units × ₹118.62');
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
    expect(row.position).toBe('100 × ₹45.00');
    expect(row.current).toBe('₹4,500');
  });

  it('writes a merged holding with what it merged into and no figures', () => {
    const row = holdingListRow(
      holdingRow({ symbol: 'HDFC', name: 'HDFC Ltd', quantity: 0, mergedIntoName: 'HDFCBANK', mergedIntoDate: '2023-07-13', currentValue: 0 }),
    );
    expect(row.merged).toEqual({ into: 'HDFCBANK', date: '2023-07-13' });
    expect(mergedLine(row.merged!)).toBe('Merged into HDFCBANK · 13 Jul 23');
    expect(row.position).toBe('0 shares');
    expect(row.avgCost).toBeNull();
    expect(row.invested).toBeNull();
    expect(row.pnl).toBeNull();
    expect(row.current).toBe('₹0');
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

  it('writes the four desktop tiles, with Realised null when the tax request failed', () => {
    const tiles = holdingsTiles(header, 13, tax);
    expect(tiles.map((t) => t?.label)).toEqual(['Current value', 'Invested', 'Unrealised P&L', 'Realised this FY']);
    expect(tiles[0]!.context).toBe('+₹3,566 today · +0.56%');
    expect(tiles[1]!.context).toBe('13 holdings');
    expect(tiles[2]).toMatchObject({ value: '+₹1,44,909', tone: 'positive', context: '+29.4% · XIRR 24.1%' });
    expect(tiles[3]).toMatchObject({ value: '−₹11,075', context: 'LTCG ₹2,425 · STCG −₹13,500' });
    expect(holdingsTiles(header, 1, null)[3]).toBeNull();
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
