import { describe, expect, it } from 'vitest';

import type { ChartData } from '@/lib/reports.types';

import { netWorthByKindRequest, netWorthParts } from './netWorthBreakdown';

const chart = (pairs: Array<[string, number | null]>, valueLabels: Record<string, string> | null = null): ChartData =>
  ({
    type: 'CHART',
    chartType: 'bar',
    dimension: 'kind',
    categories: pairs.map(([k]) => k),
    series: [{ name: 'signedValue', data: pairs.map(([, v]) => v) }],
    measure: { field: 'signedValue', aggregation: 'sum' },
    meta: {},
    valueLabels,
  }) as unknown as ChartData;

describe('netWorthByKindRequest', () => {
  it('sums signedValue of the net_worth datasource by kind', () => {
    expect(netWorthByKindRequest()).toEqual({
      type: 'CHART',
      datasource: 'net_worth',
      definition: { chartType: 'bar', dimension: { field: 'kind' }, measure: { field: 'signedValue', aggregation: 'sum' }, filters: [] },
    });
  });
});

describe('netWorthParts', () => {
  it('groups bank and cash accounts as Cash, brokers as Invested, cards as Cards and loans as Loans, in that order', () => {
    const parts = netWorthParts(
      chart([['loan', -3000000], ['broker', 628000], ['generic', 6000], ['bank_account', 860000], ['credit_card', -84800]]),
    );
    expect(parts).toEqual([
      { key: 'cash', label: 'Cash', value: 866000 },
      { key: 'invested', label: 'Invested', value: 628000 },
      { key: 'cards', label: 'Cards', value: -84800 },
      { key: 'loans', label: 'Loans', value: -3000000 },
    ]);
  });

  it('lending is left out of the line', () => {
    const parts = netWorthParts(chart([['bank_account', 100], ['lending', 5000]]));
    expect(parts?.map((p) => p.key)).toEqual(['cash']);
  });

  it('a part with no accounts is left out', () => {
    expect(netWorthParts(chart([['bank_account', 100], ['credit_card', null]]))?.map((p) => p.key)).toEqual(['cash']);
  });

  it('categories named by their label are mapped back to the stored kind', () => {
    const parts = netWorthParts(chart([['Bank account', 100], ['Wallet/Cash', 20], ['Loan', -50]], { bank_account: 'Bank account', generic: 'Wallet/Cash', loan: 'Loan' }));
    expect(parts).toEqual([
      { key: 'cash', label: 'Cash', value: 120 },
      { key: 'loans', label: 'Loans', value: -50 },
    ]);
  });

  it('nothing to show is null', () => {
    expect(netWorthParts(chart([['lending', 1]]))).toBeNull();
    expect(netWorthParts(chart([]))).toBeNull();
    expect(netWorthParts(null)).toBeNull();
  });
});
