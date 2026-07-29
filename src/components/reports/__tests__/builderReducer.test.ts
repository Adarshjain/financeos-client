import { describe, expect, it } from 'vitest';

import {
  builderReducer,
  hydrateState,
  initialBuilderState,
  newDraftId,
} from '@/components/reports/builderReducer';
import type { ReportResponse } from '@/lib/reports.types';

describe('builderReducer (CD-12)', () => {
  it('creates initial builder state with defaults', () => {
    const state = initialBuilderState();
    expect(state.mode).toBe('create');
    expect(state.type).toBe('KPI');
    expect(state.filters).toEqual([]);
    expect(state.kpi.comparisonEnabled).toBe(true);
    expect(state.chart.chartType).toBe('bar');
    expect(state.table.tableMode).toBe('raw');
  });

  it('generates unique draft IDs', () => {
    const id1 = newDraftId();
    const id2 = newDraftId();
    expect(typeof id1).toBe('string');
    expect(id1).not.toBe(id2);
  });

  it('handles SET_NAME, SET_DESCRIPTION, SET_TYPE', () => {
    let state = initialBuilderState();
    state = builderReducer(state, { type: 'SET_NAME', value: 'My Report' });
    expect(state.name).toBe('My Report');

    state = builderReducer(state, { type: 'SET_DESCRIPTION', value: 'Report description' });
    expect(state.description).toBe('Report description');

    state = builderReducer(state, { type: 'SET_TYPE', value: 'CHART' });
    expect(state.type).toBe('CHART');
  });

  it('handles filter actions: ADD_FILTER, UPDATE_FILTER, REMOVE_FILTER', () => {
    let state = initialBuilderState();
    const filter1 = { field: 'amount', operator: 'greater_than', value: 100 };
    const filter2 = { field: 'type', operator: 'is', value: 'DEBIT' };

    state = builderReducer(state, { type: 'ADD_FILTER', value: filter1 });
    state = builderReducer(state, { type: 'ADD_FILTER', value: filter2 });
    expect(state.filters).toHaveLength(2);

    const updatedFilter1 = { field: 'amount', operator: 'greater_than', value: 500 };
    state = builderReducer(state, { type: 'UPDATE_FILTER', index: 0, value: updatedFilter1 });
    expect(state.filters[0]).toEqual(updatedFilter1);

    state = builderReducer(state, { type: 'REMOVE_FILTER', index: 0 });
    expect(state.filters).toHaveLength(1);
    expect(state.filters[0]).toEqual(filter2);
  });

  it('handles draft setting actions: KPI_SET, CHART_SET, TABLE_SET, TABLE_SET_RAW, TABLE_SET_AGG', () => {
    let state = initialBuilderState();

    state = builderReducer(state, {
      type: 'KPI_SET',
      value: { measure: 'amount', aggregation: 'sum', higherIsBetter: true },
    });
    expect(state.kpi.measure).toBe('amount');
    expect(state.kpi.higherIsBetter).toBe(true);

    state = builderReducer(state, {
      type: 'CHART_SET',
      value: { chartType: 'line', dimensionField: 'date' },
    });
    expect(state.chart.chartType).toBe('line');
    expect(state.chart.dimensionField).toBe('date');

    state = builderReducer(state, {
      type: 'TABLE_SET',
      value: { tableMode: 'aggregated' },
    });
    expect(state.table.tableMode).toBe('aggregated');

    state = builderReducer(state, {
      type: 'TABLE_SET_RAW',
      value: { columns: ['amount', 'date'] },
    });
    expect(state.table.raw.columns).toEqual(['amount', 'date']);

    state = builderReducer(state, {
      type: 'TABLE_SET_AGG',
      value: { sort: [{ key: 'amount', direction: 'desc' }] },
    });
    expect(state.table.agg.sort).toEqual([{ key: 'amount', direction: 'desc' }]);
  });

  it('preserves independent drafts across type switches (KPI -> TABLE -> CHART -> KPI)', () => {
    let state = initialBuilderState('KPI');

    // 1. Configure KPI draft
    state = builderReducer(state, {
      type: 'KPI_SET',
      value: { measure: 'amount', aggregation: 'sum', higherIsBetter: true },
    });

    // 2. Switch to TABLE and configure TABLE draft
    state = builderReducer(state, { type: 'SET_TYPE', value: 'TABLE' });
    state = builderReducer(state, {
      type: 'TABLE_SET_RAW',
      value: { columns: ['date', 'amount', 'category'] },
    });

    // 3. Switch to CHART and configure CHART draft
    state = builderReducer(state, { type: 'SET_TYPE', value: 'CHART' });
    state = builderReducer(state, {
      type: 'CHART_SET',
      value: { chartType: 'pie', dimensionField: 'category' },
    });

    // 4. Switch back to KPI and assert KPI draft survived intact!
    state = builderReducer(state, { type: 'SET_TYPE', value: 'KPI' });
    expect(state.kpi.measure).toBe('amount');
    expect(state.kpi.aggregation).toBe('sum');
    expect(state.kpi.higherIsBetter).toBe(true);

    // Verify other drafts survived in background state
    expect(state.table.raw.columns).toEqual(['date', 'amount', 'category']);
    expect(state.chart.chartType).toBe('pie');
    expect(state.chart.dimensionField).toBe('category');
  });

  it('hydrates KPI report state in edit mode', () => {
    const savedKpi: ReportResponse = {
      id: 'rep-kpi-1',
      name: 'Total Income',
      description: 'Monthly sum',
      datasource: 'transactions',
      type: 'KPI',
      definition: {
        type: 'KPI',
        measure: 'amount',
        aggregation: 'SUM',
        comparison: { enabled: true, higherIsBetter: true },
        filters: [{ field: 'type', operator: 'is', value: 'CREDIT' }],
      },
    } as any;

    const hydrated = hydrateState(savedKpi);
    expect(hydrated.mode).toBe('edit');
    expect(hydrated.reportId).toBe('rep-kpi-1');
    expect(hydrated.kpi.measure).toBe('amount');
    expect(hydrated.kpi.comparisonEnabled).toBe(true);
    expect(hydrated.filters).toHaveLength(1);
  });

  it('hydrates CHART report state in edit mode', () => {
    const savedChart: ReportResponse = {
      id: 'rep-chart-1',
      name: 'Monthly Spend',
      datasource: 'transactions',
      type: 'CHART',
      definition: {
        type: 'CHART',
        chartType: 'bar',
        dimension: { field: 'date', granularity: 'month' },
        measure: { field: 'amount', aggregation: 'SUM' },
      },
    } as any;

    const hydrated = hydrateState(savedChart);
    expect(hydrated.mode).toBe('edit');
    expect(hydrated.chart.chartType).toBe('bar');
    expect(hydrated.chart.dimensionField).toBe('date');
  });

  it('hydrates TABLE raw and aggregated report states', () => {
    const savedRawTable: ReportResponse = {
      id: 'rep-table-1',
      name: 'Raw Txns',
      datasource: 'transactions',
      type: 'TABLE',
      definition: {
        type: 'TABLE',
        mode: 'raw',
        columns: ['date', 'description', 'amount'],
        sort: [{ field: 'date', direction: 'desc' }],
      },
    } as any;

    const hydratedRaw = hydrateState(savedRawTable);
    expect(hydratedRaw.table.tableMode).toBe('raw');
    expect(hydratedRaw.table.raw.columns).toEqual(['date', 'description', 'amount']);

    const savedAggTable: ReportResponse = {
      id: 'rep-table-2',
      name: 'Category Summary',
      datasource: 'transactions',
      type: 'TABLE',
      definition: {
        type: 'TABLE',
        mode: 'aggregated',
        rows: [{ field: 'category' }],
        columns: [{ field: 'type' }],
        measures: [{ field: 'amount', aggregation: 'SUM' }],
        sort: [],
      },
    } as any;

    const hydratedAgg = hydrateState(savedAggTable);
    expect(hydratedAgg.table.tableMode).toBe('aggregated');
    expect(hydratedAgg.table.agg.rows[0].field).toBe('category');
    expect(typeof hydratedAgg.table.agg.rows[0].id).toBe('string');
  });

  it('throws error when hydrated definition does not match type discriminator', () => {
    const mismatchedKpi: ReportResponse = {
      id: 'rep-bad-1',
      name: 'Mismatched',
      datasource: 'transactions',
      type: 'KPI',
      definition: {
        type: 'CHART',
        chartType: 'bar',
      },
    } as any;

    expect(() => hydrateState(mismatchedKpi)).toThrow(
      'Report rep-bad-1 is typed KPI but its definition does not match a KPI report.',
    );
  });

  it('returns unchanged state for unknown action type', () => {
    const init = initialBuilderState();
    const result = builderReducer(init, { type: 'UNKNOWN' } as any);
    expect(result).toBe(init);
  });

  it('throws on invalid CHART definition in hydrateState', () => {
    const report: any = {
      id: 'rep1',
      name: 'Bad Chart',
      type: 'CHART',
      datasource: 'transactions',
      definition: { mode: 'raw' },
    };
    expect(() => hydrateState(report)).toThrow('Report rep1 is typed CHART');
  });

  it('throws on invalid TABLE definition in hydrateState', () => {
    const report: any = {
      id: 'rep2',
      name: 'Bad Table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: { chartType: 'bar' },
    };
    expect(() => hydrateState(report)).toThrow('Report rep2 is typed TABLE');
  });

  it('hydrates catalog seed filter in initialBuilderState and agg table with columns and measures', () => {
    const mockCatalog: any = {
      fields: [{ name: 'isExcluded', type: 'boolean' }],
      operators: { boolean: ['is'] },
    };
    const seeded = initialBuilderState('KPI', mockCatalog);
    expect(seeded.filters).toHaveLength(1);
    expect(seeded.filters[0].field).toBe('isExcluded');

    const aggFull: any = {
      id: 'rep-agg-full',
      name: 'Full Agg Table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: {
        type: 'TABLE',
        mode: 'aggregated',
        rows: [{ field: 'category' }],
        columns: [{ field: 'type' }],
        measures: [{ field: 'amount', aggregation: 'SUM' }],
        sort: [{ key: 'amount', direction: 'desc' }],
      },
    };
    const hydratedFull = hydrateState(aggFull);
    expect(hydratedFull.table.agg.columns).toHaveLength(1);
    expect(hydratedFull.table.agg.measures).toHaveLength(1);
    expect(typeof hydratedFull.table.agg.columns[0].id).toBe('string');
    expect(typeof hydratedFull.table.agg.measures[0].id).toBe('string');

    const aggEmpty: any = {
      id: 'rep-agg-empty',
      name: 'Empty Agg Table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: {
        type: 'TABLE',
        mode: 'aggregated',
      },
    };
    const hydratedEmpty = hydrateState(aggEmpty);
    expect(hydratedEmpty.table.agg.rows).toEqual([]);
    expect(hydratedEmpty.table.agg.columns).toEqual([]);
    expect(hydratedEmpty.table.agg.measures).toEqual([]);
    expect(hydratedEmpty.table.agg.sort).toEqual([]);
  });
});
