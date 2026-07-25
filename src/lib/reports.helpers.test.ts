import { describe, expect, it } from 'vitest';

import {
  formatMeasureValue,
  isChartDefinition,
  isKpiDefinition,
  isMoneyField,
  isTableDefinition,
} from './reports.helpers';

// The three report views each had their own copy of this logic and had already
// diverged: the raw table used `key.includes('amount')` while KPI and pivot used
// exact equality, so a field like `refundAmount` formatted as currency in one
// view and as a plain number in the other two.
describe('isMoneyField', () => {
  it('treats amount as money', () => {
    expect(isMoneyField('amount')).toBe(true);
  });

  it('treats suffixed amount fields as money — the case that used to diverge', () => {
    expect(isMoneyField('refundAmount')).toBe(true);
    expect(isMoneyField('total_amount')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isMoneyField('Amount')).toBe(true);
  });

  it('does not treat unrelated fields as money', () => {
    expect(isMoneyField('count')).toBe(false);
    expect(isMoneyField('description')).toBe(false);
    expect(isMoneyField('accountId')).toBe(false);
  });
});

describe('formatMeasureValue', () => {
  it('renders counts as plain integers, never as currency', () => {
    expect(formatMeasureValue(1234, { field: 'amount', aggregation: 'count' })).toBe('1,234');
  });

  it('renders money fields as currency', () => {
    expect(formatMeasureValue(12345.67, { field: 'amount', aggregation: 'sum' })).toBe('₹12,345.67');
  });

  it('renders other numerics to two decimals', () => {
    expect(formatMeasureValue(12.3456, { field: 'ratio', aggregation: 'avg' })).toBe('12.35');
  });

  it('formats the same field identically regardless of caller', () => {
    // The whole point of the shared helper: raw rows pass no aggregation.
    const asRawColumn = formatMeasureValue(500, { field: 'refundAmount' });
    const asMeasure = formatMeasureValue(500, { field: 'refundAmount', aggregation: 'sum' });
    expect(asRawColumn).toBe(asMeasure);
  });

  it('returns an em dash for absent values', () => {
    expect(formatMeasureValue(null, { field: 'amount' })).toBe('—');
    expect(formatMeasureValue(undefined, { field: 'amount' })).toBe('—');
  });

  it('preserves zero rather than treating it as absent', () => {
    expect(formatMeasureValue(0, { field: 'amount', aggregation: 'sum' })).toBe('₹0.00');
  });

  it('falls back to a plain number when no field is supplied', () => {
    expect(formatMeasureValue(42, {})).toBe('42');
  });
});

// Guards for the saved-report `definition`. ReportDefinition is discriminated
// only by the outer report.type, so hydrateState used to cast blindly; a
// mismatch produced an object of undefined fields and the builder opened blank
// instead of reporting that the report could not be read.
describe('definition guards', () => {
  const kpi = { measure: 'amount', aggregation: 'sum', filters: [] };
  const chart = {
    chartType: 'bar',
    dimension: { field: 'date' },
    measure: { field: 'amount', aggregation: 'sum' },
    filters: [],
  };
  const rawTable = { mode: 'raw', columns: ['amount'], filters: [] };
  const aggTable = { mode: 'aggregated', rows: [], measures: [], filters: [] };

  it('accepts each shape as itself', () => {
    expect(isKpiDefinition(kpi)).toBe(true);
    expect(isChartDefinition(chart)).toBe(true);
    expect(isTableDefinition(rawTable)).toBe(true);
    expect(isTableDefinition(aggTable)).toBe(true);
  });

  it('tells KPI and CHART apart — measure is a string vs an object', () => {
    expect(isKpiDefinition(chart)).toBe(false);
    expect(isChartDefinition(kpi)).toBe(false);
  });

  it('rejects a TABLE definition offered as KPI or CHART', () => {
    expect(isKpiDefinition(rawTable)).toBe(false);
    expect(isChartDefinition(rawTable)).toBe(false);
  });

  it('rejects a TABLE definition with no recognised mode', () => {
    expect(isTableDefinition({ columns: [], filters: [] })).toBe(false);
    expect(isTableDefinition({ mode: 'pivot', filters: [] })).toBe(false);
  });

  it('rejects non-objects rather than throwing', () => {
    for (const bad of [null, undefined, 'kpi', 42, true]) {
      expect(isKpiDefinition(bad)).toBe(false);
      expect(isChartDefinition(bad)).toBe(false);
      expect(isTableDefinition(bad)).toBe(false);
    }
  });
});
