import { describe, expect, it } from 'vitest';

import type { DatasourceCatalog } from '@/lib/reports.types';

import type { BuilderState } from '../builderReducer';
import { initialBuilderState } from '../builderReducer';
import {
  aggregatedColumnKey,
  buildCreateRequest,
  buildRunRequest,
  buildUpdateRequest,
  isMinimalValid,
  serializeDefinition,
  validateReportState,
  validationErrors,
} from '../serialize';

// Minimal catalog: `date` is the only date-typed field, which is what
// isDateFieldName keys the granularity rules off.
const catalog = {
  operators: {
    number: ['equals', 'between'],
    string: ['exact'],
    enum: ['is', 'in'],
    boolean: ['is'],
    date: { absolute: ['is', 'between'], relative: ['all_time'] },
  },
  fields: [
    { name: 'amount', label: 'Amount', type: 'number', role: 'measure', allowedInReports: ['TABLE'] },
    { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['TABLE'] },
    { name: 'category', label: 'Category', type: 'enum', role: 'dimension', allowedInReports: ['TABLE'] },
    { name: 'accountId', label: 'Account', type: 'enum', role: 'dimension', allowedInReports: ['TABLE'] },
    { name: 'isExcluded', label: 'Excluded', type: 'boolean', role: 'filter', allowedInReports: ['TABLE'] },
  ],
} as unknown as DatasourceCatalog;

function pivotState(agg: Partial<BuilderState['table']['agg']>): BuilderState {
  const state = initialBuilderState('TABLE');
  state.table.tableMode = 'aggregated';
  state.table.agg = { rows: [], columns: [], measures: [], sort: [], ...agg };
  return state;
}

const dim = (field: string) => ({ id: `d-${field}`, field });
const measure = (field: string, aggregation = 'sum') => ({
  id: `m-${field}-${aggregation}`,
  field,
  aggregation: aggregation as 'sum',
});

describe('validationErrors — pivot duplicates', () => {
  it('accepts a well-formed pivot', () => {
    const errors = validationErrors(
      pivotState({ rows: [dim('category')], measures: [measure('amount')] }),
      catalog,
    );
    expect(errors).toEqual([]);
  });

  it('still rejects a field used in both rows and columns', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        columns: [dim('category')],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).toContain('A field cannot be used in both rows and columns.');
  });

  it('rejects the same field twice in rows', () => {
    const errors = validationErrors(
      pivotState({
        rows: [
          { id: 'a', field: 'category' },
          { id: 'b', field: 'category' },
        ],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).toContain('Each row dimension must be a different field.');
  });

  it('rejects the same field twice in columns', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        columns: [
          { id: 'a', field: 'accountId' },
          { id: 'b', field: 'accountId' },
        ],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).toContain('Each column dimension must be a different field.');
  });

  it('rejects the same field/aggregation measure twice', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        measures: [
          { id: 'a', field: 'amount', aggregation: 'sum' },
          { id: 'b', field: 'amount', aggregation: 'sum' },
        ],
      }),
      catalog,
    );
    expect(errors).toContain(
      'Each measure must be a different field/aggregation pair.',
    );
  });

  it('allows the same field twice under different aggregations', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        measures: [
          { id: 'a', field: 'amount', aggregation: 'sum' },
          { id: 'b', field: 'amount', aggregation: 'avg' },
        ],
      }),
      catalog,
    );
    expect(errors).toEqual([]);
  });

  it('ignores incomplete drafts when checking duplicates', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category'), { id: 'blank1' }, { id: 'blank2' }],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).not.toContain('Each row dimension must be a different field.');
  });
});

describe('serializeDefinition and request builders (CD-13)', () => {
  it('serializes KPI definition with comparison options', () => {
    const state = initialBuilderState('KPI');
    state.kpi = {
      measure: 'amount',
      aggregation: 'SUM' as any,
      comparisonEnabled: false,
      higherIsBetter: false,
    };

    const def = serializeDefinition(state, catalog) as any;
    expect(def.measure).toBe('amount');
    expect(def.aggregation).toBe('SUM');
    expect(def.comparison).toEqual({ enabled: false, higherIsBetter: false });
  });

  it('serializes CHART definition including date granularity and series', () => {
    const state = initialBuilderState('CHART');
    state.chart = {
      chartType: 'line',
      dimensionField: 'date',
      dimensionGranularity: 'month',
      seriesField: 'category',
      measureField: 'amount',
      measureAggregation: 'SUM' as any,
    };

    const def = serializeDefinition(state, catalog) as any;
    expect(def.chartType).toBe('line');
    expect(def.dimension).toEqual({ field: 'date', granularity: 'month' });
    expect(def.series).toEqual({ field: 'category' }); // non-date field omits granularity
    expect(def.measure).toEqual({ field: 'amount', aggregation: 'SUM' });
  });

  it('serializes TABLE raw and aggregated definitions', () => {
    const stateRaw = initialBuilderState('TABLE');
    stateRaw.table.tableMode = 'raw';
    stateRaw.table.raw = {
      columns: ['amount', 'date'],
      sort: [{ field: 'date', direction: 'desc' }],
    };

    const defRaw = serializeDefinition(stateRaw, catalog) as any;
    expect(defRaw.mode).toBe('raw');
    expect(defRaw.columns).toEqual(['amount', 'date']);
    expect(defRaw.sort).toEqual([{ field: 'date', direction: 'desc' }]);

    const stateAgg = pivotState({
      rows: [{ id: '1', field: 'date', granularity: 'year' }],
      columns: [{ id: '2', field: 'category' }],
      measures: [{ id: '3', field: 'amount', aggregation: 'SUM' as any }],
      sort: [{ field: 'amount_SUM', direction: 'asc' }],
    });

    const defAgg = serializeDefinition(stateAgg, catalog) as any;
    expect(defAgg.mode).toBe('aggregated');
    expect(defAgg.rows).toEqual([{ field: 'date', granularity: 'year' }]);
    expect(defAgg.columns).toEqual([{ field: 'category' }]);
    expect(defAgg.measures).toEqual([{ field: 'amount', aggregation: 'SUM' }]);
  });

  it('builds run, create, and update requests', () => {
    const state = initialBuilderState('KPI');
    state.name = ' Report Name ';
    state.description = ' Report Description ';
    state.kpi = { measure: 'amount', aggregation: 'SUM' as any, comparisonEnabled: true };

    const runReq = buildRunRequest(state, catalog);
    expect(runReq.type).toBe('KPI');

    const createReq = buildCreateRequest(state, catalog);
    expect(createReq.name).toBe('Report Name');
    expect(createReq.description).toBe('Report Description');

    const updateReq = buildUpdateRequest(state, catalog);
    expect(updateReq.name).toBe('Report Name');
  });

  it('generates aggregatedColumnKey', () => {
    expect(aggregatedColumnKey('amount', 'sum')).toBe('amount_sum');
  });

  it('validates date dimension missing granularity and row/column collisions', () => {
    const mockCatalog: any = {
      fields: [{ name: 'date', type: 'date' }],
    };

    const stateWithMissingGran: any = {
      ...initialBuilderState('TABLE'),
      table: {
        tableMode: 'aggregated',
        agg: {
          rows: [{ field: 'date' }], // Missing granularity!
          columns: [],
          measures: [{ field: 'amount', aggregation: 'SUM' }],
          sort: [],
        },
      },
    };

    const errorsGran = validationErrors(stateWithMissingGran, mockCatalog);
    expect(errorsGran).toContain('Select a granularity for each date dimension.');

    const stateWithCollision: any = {
      ...initialBuilderState('TABLE'),
      table: {
        tableMode: 'aggregated',
        agg: {
          rows: [{ field: 'category' }],
          columns: [{ field: 'category' }], // Collision!
          measures: [{ field: 'amount', aggregation: 'SUM' }],
          sort: [],
        },
      },
    };

    const errorsCollision = validationErrors(stateWithCollision, mockCatalog);
    expect(errorsCollision).toContain('A field cannot be used in both rows and columns.');
  });

  it('checks isMinimalValid correctly', () => {
    const stateInvalid = initialBuilderState('KPI');
    expect(isMinimalValid(stateInvalid, catalog)).toBe(false);

    const stateValid = initialBuilderState('KPI');
    stateValid.kpi = { measure: 'amount', aggregation: 'SUM' as any, comparisonEnabled: true };
    expect(isMinimalValid(stateValid, catalog)).toBe(true);
  });

  it('buildRunRequest, buildCreateRequest, buildUpdateRequest serialize correctly', () => {
    const state = initialBuilderState('KPI');
    state.name = '  Test Report  ';
    state.description = '  Test Description  ';
    state.kpi = { measure: 'amount', aggregation: 'sum', comparisonEnabled: true, higherIsBetter: true };

    const runReq = buildRunRequest(state, catalog);
    expect(runReq.type).toBe('KPI');
    expect(runReq.datasource).toBe('transactions');

    const createReq = buildCreateRequest(state, catalog);
    expect(createReq.name).toBe('Test Report');
    expect(createReq.description).toBe('Test Description');

    const updateReq = buildUpdateRequest(state, catalog);
    expect(updateReq.name).toBe('Test Report');
  });

  it('filters complete clauses by valueKind branches', () => {
    const customCatalog = {
      operators: {
        number: ['between'],
        date: { absolute: ['between'], relative: ['all_time'] },
        boolean: ['is'],
        enum: ['in'],
      },
      fields: [
        { name: 'amount', label: 'Amount', type: 'number', role: 'measure', allowedInReports: ['TABLE'] },
        { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['TABLE'] },
        { name: 'isExcluded', label: 'Excluded', type: 'boolean', role: 'filter', allowedInReports: ['TABLE'] },
        { name: 'category', label: 'Category', type: 'enum', role: 'dimension', allowedInReports: ['TABLE'] },
      ],
    } as unknown as DatasourceCatalog;

    const state = initialBuilderState('TABLE');
    state.filters = [
      { field: 'amount', operator: 'between', value: { from: 10, to: 20 } },
      { field: 'amount', operator: 'between', value: 'invalid' },
      { field: 'date', operator: 'between', value: { from: '2026-01-01', to: '2026-01-31' } },
      { field: 'date', operator: 'between', value: { from: '', to: '' } },
      { field: 'isExcluded', operator: 'is', value: true },
      { field: 'category', operator: 'in', value: ['Shopping', 'Food'] },
      { field: 'category', operator: 'in', value: [] },
    ] as any;

    const def = serializeDefinition(state, customCatalog);
    expect(def.filters).toHaveLength(4);
  });
});

describe('validationErrors — pivot duplicates', () => {
  it('accepts a well-formed pivot', () => {
    const errors = validationErrors(
      pivotState({ rows: [dim('category')], measures: [measure('amount')] }),
      catalog,
    );
    expect(errors).toEqual([]);
  });

  it('still rejects a field used in both rows and columns', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        columns: [dim('category')],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).toContain('A field cannot be used in both rows and columns.');
  });

  // The gap: only cross-list overlap was checked, so the same dimension could be
  // grouped on twice within one axis and saved as a nonsensical query.
  it('rejects the same field twice in rows', () => {
    const errors = validationErrors(
      pivotState({
        rows: [
          { id: 'a', field: 'category' },
          { id: 'b', field: 'category' },
        ],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).toContain('Each row dimension must be a different field.');
  });

  it('rejects the same field twice in columns', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        columns: [
          { id: 'a', field: 'accountId' },
          { id: 'b', field: 'accountId' },
        ],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).toContain('Each column dimension must be a different field.');
  });

  it('rejects the same field/aggregation measure twice', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        measures: [
          { id: 'a', field: 'amount', aggregation: 'sum' },
          { id: 'b', field: 'amount', aggregation: 'sum' },
        ],
      }),
      catalog,
    );
    expect(errors).toContain(
      'Each measure must be a different field/aggregation pair.',
    );
  });

  it('allows the same field twice under different aggregations', () => {
    const errors = validationErrors(
      pivotState({
        rows: [dim('category')],
        measures: [
          { id: 'a', field: 'amount', aggregation: 'sum' },
          { id: 'b', field: 'amount', aggregation: 'avg' },
        ],
      }),
      catalog,
    );
    expect(errors).toEqual([]);
  });

  it('ignores incomplete drafts when checking duplicates', () => {
    // Two blank rows are not "duplicates" — the user is mid-edit.
    const errors = validationErrors(
      pivotState({
        rows: [dim('category'), { id: 'blank1' }, { id: 'blank2' }],
        measures: [measure('amount')],
      }),
      catalog,
    );
    expect(errors).not.toContain('Each row dimension must be a different field.');
  });
});
