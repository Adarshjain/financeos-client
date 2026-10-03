import { describe, expect, it } from 'vitest';

import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

import type { BuilderState } from '../builderReducer';
import { initialBuilderState } from '../builderReducer';
import { validationErrors } from '../serialize';

const operators = {
  date: { absolute: ['is', 'between'], relative: ['this_month'], cycle: ['this_billing_cycle', 'previous_billing_cycle'] },
  string: ['exact'],
  number: ['equals'],
  enum: ['is', 'in'],
  boolean: ['is'],
};

const catalog = {
  billingCycleAccountField: 'account',
  operators,
  fields: [
    { name: 'amount', label: 'Amount', type: 'number', role: 'measure', aggregations: ['sum'], allowedInReports: ['KPI', 'CHART', 'TABLE'] },
    { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['CHART', 'TABLE'], billingCycle: true },
    { name: 'account', label: 'Account', type: 'enum', role: 'dimension', dynamic: true, allowedInReports: ['CHART', 'TABLE'] },
    { name: 'billingCycle', label: 'Billing cycle', type: 'string', role: 'dimension', allowedInReports: ['CHART', 'TABLE'], billingCycle: true },
    { name: 'category', label: 'Category', type: 'enum', role: 'dimension', dynamic: true, allowedInReports: ['CHART', 'TABLE'] },
  ],
} as DatasourceCatalog;

const MESSAGE = 'Billing cycles differ per account: add one "Account is …" filter.';
const cycle: FilterClause = { field: 'date', operator: 'this_billing_cycle' } as FilterClause;
const oneAccount: FilterClause = { field: 'account', operator: 'is', value: 'HDFC Regalia' } as FilterClause;

function kpi(filters: FilterClause[]): BuilderState {
  const state = initialBuilderState('KPI');
  state.kpi = { ...state.kpi, measure: 'amount', aggregation: 'sum' };
  state.filters = filters;
  return state;
}

function chart(dimensionField: string, seriesField?: string, chartType = 'bar', filters: FilterClause[] = []): BuilderState {
  const state = initialBuilderState('CHART');
  state.chart = { ...state.chart, chartType: chartType as 'bar', dimensionField, seriesField, measureField: 'amount', measureAggregation: 'sum' };
  state.filters = filters;
  return state;
}

describe('validationErrors — billing cycles need one account', () => {
  it('flags a cycle filter without an account filter', () => {
    expect(validationErrors(kpi([cycle]), catalog)).toEqual([MESSAGE]);
  });

  it('accepts a cycle filter with one "is" account filter, or "in" with a single value', () => {
    expect(validationErrors(kpi([cycle, oneAccount]), catalog)).toEqual([]);
    const inOne = { field: 'account', operator: 'in', value: ['HDFC Regalia'] } as FilterClause;
    expect(validationErrors(kpi([cycle, inOne]), catalog)).toEqual([]);
  });

  it('flags several accounts, two account filters, or an account filter without a value', () => {
    const inTwo = { field: 'account', operator: 'in', value: ['A', 'B'] } as FilterClause;
    expect(validationErrors(kpi([cycle, inTwo]), catalog)).toEqual([MESSAGE]);
    expect(validationErrors(kpi([cycle, oneAccount, { ...oneAccount, value: 'Other' } as FilterClause]), catalog)).toEqual([MESSAGE]);
    expect(validationErrors(kpi([cycle, { ...oneAccount, value: '' } as FilterClause]), catalog)).toEqual([MESSAGE]);
  });

  it('flags grouping by billing cycle in a chart dimension or series, raw columns and pivot rows/columns', () => {
    expect(validationErrors(chart('billingCycle'), catalog)).toEqual([MESSAGE]);
    expect(validationErrors(chart('category', 'billingCycle'), catalog)).toEqual([MESSAGE]);
    const raw = initialBuilderState('TABLE');
    raw.table.raw.columns = ['amount', 'billingCycle'];
    expect(validationErrors(raw, catalog)).toEqual([MESSAGE]);
    const pivot = initialBuilderState('TABLE');
    pivot.table.tableMode = 'aggregated';
    pivot.table.agg = { rows: [{ id: 'r', field: 'category' }], columns: [{ id: 'c', field: 'billingCycle' }], measures: [{ id: 'm', field: 'amount', aggregation: 'sum' }], sort: [] };
    expect(validationErrors(pivot, catalog)).toEqual([MESSAGE]);
    expect(validationErrors(chart('billingCycle', undefined, 'bar', [oneAccount]), catalog)).toEqual([]);
  });

  it('ignores a pie or donut series (the server drops it) and the billing-cycle flag on date fields when grouping', () => {
    expect(validationErrors(chart('category', 'billingCycle', 'pie'), catalog)).toEqual([]);
    const byDate = chart('date');
    byDate.chart.dimensionGranularity = 'month';
    expect(validationErrors(byDate, catalog)).toEqual([]);
  });

  it('says billing cycles are unavailable when the datasource has no account field', () => {
    const noAccount = { ...catalog, billingCycleAccountField: undefined } as DatasourceCatalog;
    expect(validationErrors(kpi([cycle]), noAccount)).toEqual(['Billing cycles are not available for this datasource.']);
  });

  it('does nothing for reports without billing cycles', () => {
    expect(validationErrors(kpi([{ field: 'date', operator: 'this_month' } as FilterClause]), catalog)).toEqual([]);
  });
});
