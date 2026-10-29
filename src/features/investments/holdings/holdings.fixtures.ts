import type { HoldingRow, HoldingsGroup, HoldingsHeader, HoldingsResponse } from '@/lib/investments.types';

export function holdingRow(over: Partial<HoldingRow> = {}): HoldingRow {
  return {
    instrumentId: 'i-hdfcbank',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    assetType: 'stock',
    quantity: 40,
    avgCost: 1580,
    ltp: 1742.6,
    priceAsOf: '2026-10-13',
    manualPrice: false,
    noPrice: false,
    currentValue: 69704,
    invested: 63200,
    unrealised: 6504,
    unrealisedPct: 10.29,
    dayChange: -208,
    dayChangePct: -0.3,
    brokerCount: 1,
    mergedIntoName: null,
    mergedIntoDate: null,
    ...over,
  };
}

export const header: HoldingsHeader = {
  currentValue: 638208,
  dayChange: 3566,
  dayChangePct: 0.56,
  invested: 493299,
  unrealised: 144909,
  unrealisedPct: 29.4,
  xirr: 24.1,
  priceAsOf: '2026-10-13',
};

export const groups: HoldingsGroup[] = [
  { assetType: 'stock', value: 401290, count: 8 },
  { assetType: 'mutual_fund', value: 196268, count: 3 },
  { assetType: 'etf', value: 40650, count: 2 },
];

export function holdingsResponse(rows: HoldingRow[], over: Partial<HoldingsResponse> = {}): HoldingsResponse {
  return { header, groups, holdings: rows, page: 0, size: 50, totalElements: rows.length, totalPages: 1, movers: [], portfolioGroups: groups, ...over };
}
