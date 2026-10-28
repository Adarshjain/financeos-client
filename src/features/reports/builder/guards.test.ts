import { describe, expect, it } from 'vitest';

import type { DatasourceCatalog, FieldDefinition, FilterClause, ReportDefinition, ReportType } from '@/lib/reports.types';

import { hydrateState } from './builderReducer';
import { aggregationBlockedReason, filterBlockedReason, guardProblems, splitBlockedReason } from './guards';

const ALL = ['sum', 'avg', 'count', 'min', 'max'] as const;
const f = (x: Partial<FieldDefinition> & Pick<FieldDefinition, 'name' | 'label' | 'type' | 'role'>): FieldDefinition => ({ allowedInReports: ['KPI', 'CHART', 'TABLE'], ...x });

const catalog: DatasourceCatalog = {
  operators: {
    date: { absolute: ['is', 'before', 'after', 'between'], relative: ['this_month'] },
    string: ['contains', 'equals', 'in'],
    number: ['equals', 'between'],
    enum: ['is', 'is_not', 'in', 'not_in'],
    boolean: ['is'],
  },
  fields: [
    f({ name: 'balance', label: 'Balance', type: 'number', role: 'measure', aggregations: [...ALL], guards: [{ kind: 'no_aggregation', aggregations: ['sum'], reason: 'is a snapshot, so it cannot be summed' }] }),
    f({ name: 'spend', label: 'Spend', type: 'number', role: 'measure', aggregations: [...ALL], guards: [{ kind: 'needs', fields: ['category', 'date'], aggregations: null, reason: 'mixes accounts' }] }),
    f({ name: 'rate', label: 'Rate', type: 'number', role: 'measure', aggregations: [...ALL], guards: [{ kind: 'needs', fields: ['category'], aggregations: ['avg'], reason: 'needs a scope' }] }),
    f({ name: 'yield', label: 'Yield', type: 'number', role: 'measure', aggregations: [...ALL], guards: [{ kind: 'avoid', fields: ['type', 'category'], aggregations: null, reason: 'is already per type' }] }),
    f({ name: 'category', label: 'Category', type: 'enum', role: 'dimension', dynamic: true }),
    f({ name: 'type', label: 'Type', type: 'enum', role: 'dimension', values: ['DEBIT', 'CREDIT'] }),
    f({ name: 'date', label: 'Date', type: 'date', role: 'dimension' }),
    f({ name: 'ref', label: 'Reference', type: 'string', role: 'dimension', guards: [{ kind: 'no_filter', reason: 'is internal' }] }),
  ],
};

const make = (type: ReportType, definition: object, filters: FilterClause[] = []) =>
  hydrateState({
    id: 'r1', name: 'R', description: null, type, datasource: 'x',
    definition: { ...definition, filters } as unknown as ReportDefinition, createdAt: '', updatedAt: '',
  });

const chart = (measure: string, aggregation: string, extra: object = {}, filters: FilterClause[] = []) =>
  make('CHART', { chartType: 'bar', dimension: { field: 'type' }, measure: { field: measure, aggregation }, ...extra }, filters);
const kpi = (measure: string, aggregation: string, filters: FilterClause[] = []) => make('KPI', { measure, aggregation }, filters);
const raw = (columns: string[], filters: FilterClause[] = []) => make('TABLE', { mode: 'raw', columns }, filters);
const agg = (rows: string[], measures: { field: string; aggregation: string }[], filters: FilterClause[] = [], columns: string[] = []) =>
  make('TABLE', { mode: 'aggregated', rows: rows.map((field) => ({ field })), columns: columns.map((field) => ({ field })), measures }, filters);

const is = (field: string, value: FilterClause['value']): FilterClause => ({ field, operator: 'is', value });
const within = (field: string, value: string[]): FilterClause => ({ field, operator: 'in', value });
const problems = (s: ReturnType<typeof make>) => guardProblems(s, catalog);

describe('no_aggregation', () => {
  it('blocks the listed aggregation and allows the others', () => {
    expect(problems(kpi('balance', 'sum'))).toEqual(['Balance is a snapshot, so it cannot be summed.']);
    expect(problems(kpi('balance', 'avg'))).toEqual([]);
  });
  it('applies to a chart and an aggregated table measure', () => {
    expect(problems(chart('balance', 'sum'))).toHaveLength(1);
    expect(problems(agg(['type'], [{ field: 'balance', aggregation: 'sum' }]))).toHaveLength(1);
  });
});

describe('needs', () => {
  it('is unmet without a split or a single-value filter', () => {
    expect(problems(kpi('spend', 'sum'))).toEqual(['Spend mixes accounts. Split by Category or Date, or filter it to one value.']);
  });
  it('is met by a split on one of the fields', () => {
    expect(problems(chart('spend', 'sum', { dimension: { field: 'category' } }))).toEqual([]);
    expect(problems(chart('spend', 'sum', { dimension: { field: 'type' }, series: { field: 'category' } }))).toEqual([]);
    expect(problems(agg(['type'], [{ field: 'spend', aggregation: 'sum' }], [], ['category']))).toEqual([]);
  });
  it('is met by "is" or a one-value "in", not by a two-value "in"', () => {
    expect(problems(kpi('spend', 'sum', [is('category', 'Food')]))).toEqual([]);
    expect(problems(kpi('spend', 'sum', [within('category', ['Food'])]))).toEqual([]);
    expect(problems(kpi('spend', 'sum', [within('category', ['Food', 'Rent'])]))).toHaveLength(1);
  });
  it('is met by a one-value "exact", except on a date field', () => {
    expect(problems(kpi('spend', 'sum', [{ field: 'category', operator: 'exact', value: 'Food' }]))).toEqual([]);
    expect(problems(kpi('spend', 'sum', [{ field: 'date', operator: 'exact', value: '2026-10-01' }]))).toHaveLength(1);
  });
  it('is not met by "in" on a date field, but by "is"', () => {
    expect(problems(kpi('spend', 'sum', [within('date', ['2026-10-01'])]))).toHaveLength(1);
    expect(problems(kpi('spend', 'sum', [is('date', '2026-10-01')]))).toEqual([]);
  });
  it('exempts count by default and ignores an aggregation outside its list', () => {
    expect(problems(kpi('spend', 'count'))).toEqual([]);
    expect(problems(kpi('rate', 'sum'))).toEqual([]);
    expect(problems(kpi('rate', 'avg'))).toEqual(['Rate needs a scope. Split by Category, or filter it to one value.']);
  });
  it('ignores a raw table', () => {
    expect(problems(raw(['spend']))).toEqual([]);
  });
});

describe('avoid', () => {
  it('is broken by a split on a listed field', () => {
    expect(problems(chart('yield', 'sum'))).toEqual(['Yield is already per type. Remove the split or filter on Type.']);
  });
  it('is broken by a filter on a listed field, naming every conflict', () => {
    expect(problems(kpi('yield', 'sum', [is('type', 'DEBIT')]))).toEqual(['Yield is already per type. Remove the split or filter on Type.']);
    expect(problems(chart('yield', 'sum', {}, [is('category', 'Food')]))).toEqual(['Yield is already per type. Remove the split or filter on Type and Category.']);
  });
  it('holds when none of the fields is used', () => {
    expect(problems(chart('yield', 'sum', { dimension: { field: 'date', granularity: 'month' } }))).toEqual([]);
  });
});

describe('no_filter', () => {
  it('blocks a filter on the field in any report type, including a raw table', () => {
    const msg = ["Reference is internal, so it can't be filtered."];
    expect(problems(raw(['ref'], [{ field: 'ref', operator: 'contains', value: 'x' }]))).toEqual(msg);
    expect(problems(kpi('balance', 'avg', [{ field: 'ref', operator: 'contains', value: 'x' }]))).toEqual(msg);
  });
  it('does not mind the field being a column', () => {
    expect(problems(raw(['ref']))).toEqual([]);
  });
});

describe('messages', () => {
  it('are deduped', () => {
    const s = agg(['type'], [{ field: 'balance', aggregation: 'sum' }, { field: 'balance', aggregation: 'sum' }]);
    expect(problems(s)).toHaveLength(1);
  });
});

describe('picker helpers', () => {
  it('aggregationBlockedReason', () => {
    expect(aggregationBlockedReason(catalog, 'balance', 'sum')).toBe('Balance is a snapshot, so it cannot be summed.');
    expect(aggregationBlockedReason(catalog, 'balance', 'avg')).toBeUndefined();
  });
  it('splitBlockedReason follows the measures in use', () => {
    expect(splitBlockedReason(catalog, [{ field: 'yield', aggregation: 'sum' }], 'type')).toBe('Yield is already per type. Remove the split or filter on Type.');
    expect(splitBlockedReason(catalog, [{ field: 'spend', aggregation: 'sum' }], 'type')).toBeUndefined();
    expect(splitBlockedReason(catalog, [{ field: 'yield' }], 'category')).toBeDefined();
  });
  it('filterBlockedReason', () => {
    expect(filterBlockedReason(catalog, 'ref')).toBe("Reference is internal, so it can't be filtered.");
    expect(filterBlockedReason(catalog, 'type')).toBeUndefined();
  });
});
