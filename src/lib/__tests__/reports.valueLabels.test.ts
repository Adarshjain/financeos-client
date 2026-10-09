import { describe, expect, it } from 'vitest';

import { labelChartData, valueLabel } from '@/lib/reports.helpers';

describe('valueLabel', () => {
  it('reads a stored value through its label', () => {
    expect(valueLabel('bank_account', { bank_account: 'Bank account' })).toBe('Bank account');
  });

  it('keeps a value without a label, or without any labels, as stored', () => {
    expect(valueLabel('loan', { bank_account: 'Bank account' })).toBe('loan');
    expect(valueLabel('loan', null)).toBe('loan');
    expect(valueLabel('loan', undefined)).toBe('loan');
  });
});

describe('labelChartData', () => {
  const base = {
    chartType: 'bar',
    categories: ['bank_account', 'credit_card', 'other'],
    series: [
      { name: 'asset', data: [1, 2, 3] },
      { name: 'liability', data: [4, 5, 6] },
    ],
  };

  it('returns the same object when the chart has no labels', () => {
    expect(labelChartData(base)).toBe(base);
  });

  it('labels categories through valueLabels, leaving unlabelled ones as stored', () => {
    const out = labelChartData({ ...base, valueLabels: { bank_account: 'Bank account', credit_card: 'Credit card' } });
    expect(out.categories).toEqual(['Bank account', 'Credit card', 'other']);
    expect(out.series).toEqual(base.series);
  });

  it('labels series names through seriesValueLabels, keeping their data', () => {
    const out = labelChartData({ ...base, seriesValueLabels: { asset: 'Asset', liability: 'Liability' } });
    expect(out.categories).toEqual(base.categories);
    expect(out.series).toEqual([
      { name: 'Asset', data: [1, 2, 3] },
      { name: 'Liability', data: [4, 5, 6] },
    ]);
  });

  it('does not change the input', () => {
    const input = { ...base, valueLabels: { bank_account: 'Bank account' }, seriesValueLabels: { asset: 'Asset' } };
    labelChartData(input);
    expect(input.categories[0]).toBe('bank_account');
    expect(input.series[0].name).toBe('asset');
  });
});
