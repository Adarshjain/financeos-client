import { describe, expect, it } from 'vitest';

import type { ChartDefinition, ReportResponse } from '@/lib/reports.types';

import { builderReducer, type BuilderState, hydrateState, initialBuilderState } from './builderReducer';
import { catalogFixture, savedChart } from './editor.fixtures';
import { makeEditorReducer, workingCatalog } from './editorState';
import { serializeDefinition, validationErrors, validationIssues } from './serialize';

const catalog = workingCatalog(catalogFixture, 'transactions');

function chartState(chart: Partial<BuilderState['chart']> = {}): BuilderState {
  const base = { ...initialBuilderState('CHART', catalog, 'transactions'), filters: [] };
  return {
    ...base,
    chart: { chartType: 'bar', dimensionField: 'category', measureField: 'spend', measureAggregation: 'sum', ...chart },
  };
}

const chartDef = (chart?: Partial<BuilderState['chart']>) => serializeDefinition(chartState(chart), catalog) as ChartDefinition;

describe('chart definition: Top N, Other, order', () => {
  it('sends none of the new fields until they are set', () => {
    const d = chartDef();
    expect(Object.keys(d).sort()).toEqual(['chartType', 'dimension', 'filters', 'measure']);
  });

  it('sends limit, other and order as set', () => {
    expect(chartDef({ limit: 8, other: true, order: 'value_asc' })).toMatchObject({ limit: 8, other: true, order: 'value_asc' });
  });

  it('sends other only together with a limit', () => {
    expect(chartDef({ other: true })).not.toHaveProperty('other');
    expect(chartDef({ limit: 3, other: false })).not.toHaveProperty('other');
  });

  it('rejects a Top N outside 1 to 50 and a fraction, at the limit field', () => {
    for (const limit of [0, 51, 2.5, Number.NaN]) {
      expect(validationIssues(chartState({ limit }), catalog)).toEqual([{ key: 'limit', message: 'Top N must be a whole number from 1 to 50.' }]);
    }
    expect(validationErrors(chartState({ limit: 50 }), catalog)).toEqual([]);
    expect(validationErrors(chartState({ limit: 1 }), catalog)).toEqual([]);
  });
});

describe('chart definition: comparison', () => {
  it('sends the comparison with its period, direction and display', () => {
    expect(chartDef({ comparisonEnabled: true, comparisonHigherIsBetter: false, comparisonDisplay: 'previous_value' }).comparison).toEqual({
      enabled: true,
      period: 'previous_period',
      higherIsBetter: false,
      display: 'previous_value',
    });
  });

  it('omits direction and display when they are the defaults', () => {
    expect(chartDef({ comparisonEnabled: true }).comparison).toEqual({ enabled: true, period: 'previous_period' });
  });

  it('drops the comparison on a date dimension', () => {
    const d = chartDef({ comparisonEnabled: true, dimensionField: 'date', dimensionGranularity: 'month' });
    expect(d).not.toHaveProperty('comparison');
  });

  it('sends none while it is off', () => {
    expect(chartDef({ comparisonEnabled: false })).not.toHaveProperty('comparison');
  });
});

describe('chart definition: breakdown', () => {
  it('sends the chart type, sub-dimension and sub-limit', () => {
    const d = chartDef({ chartType: 'breakdown', subDimensionField: 'description', subLimit: 4, limit: 8, other: true });
    expect(d).toMatchObject({ chartType: 'breakdown', subDimension: { field: 'description' }, subLimit: 4, limit: 8, other: true });
  });

  it('omits the sub-limit while the server default applies, and everything sub without a sub-dimension', () => {
    expect(chartDef({ chartType: 'breakdown', subDimensionField: 'description' })).not.toHaveProperty('subLimit');
    const d = chartDef({ chartType: 'breakdown', subLimit: 4 });
    expect(d).not.toHaveProperty('subDimension');
    expect(d).not.toHaveProperty('subLimit');
  });

  it('flags sub-rows that are the rows’ own field', () => {
    expect(validationIssues(chartState({ chartType: 'breakdown', subDimensionField: 'category' }), catalog)).toEqual([
      { key: 'subDimension', message: 'Sub-rows must differ from rows.' },
    ]);
  });

  it('drops the sub-dimension when the dimension is changed to the same field', () => {
    const state = chartState({ chartType: 'breakdown', subDimensionField: 'type' });
    const next = builderReducer(state, { type: 'CHART_SET', value: { dimensionField: 'type' } });
    expect(next.chart.subDimensionField).toBeUndefined();
    const other = builderReducer(state, { type: 'CHART_SET', value: { dimensionField: 'category' } });
    expect(other.chart.subDimensionField).toBe('type');
  });

  it('keeps sub-rows to a breakdown, and a series off a breakdown, pie and donut', () => {
    expect(chartDef({ chartType: 'bar', subDimensionField: 'description' })).not.toHaveProperty('subDimension');
    for (const chartType of ['breakdown', 'pie', 'donut'] as const) {
      expect(chartDef({ chartType, seriesField: 'type' })).not.toHaveProperty('series');
    }
    expect(chartDef({ chartType: 'stackedBar', seriesField: 'type' })).toHaveProperty('series', { field: 'type' });
  });

  it('asks for a granularity on a date sub-dimension and a sub-limit from 1 to 10', () => {
    expect(validationIssues(chartState({ chartType: 'breakdown', subDimensionField: 'date' }), catalog)).toEqual([
      { key: 'subDimension', message: 'Select a granularity for the date sub-rows.' },
    ]);
    expect(validationIssues(chartState({ chartType: 'breakdown', subDimensionField: 'description', subLimit: 11 }), catalog)).toEqual([
      { key: 'subLimit', message: 'Sub-rows must be a whole number from 1 to 10.' },
    ]);
  });
});

describe('chart definition: breakdown columns and bars', () => {
  const comparing = { comparisonEnabled: true };

  it('sends columns and bars only when set off the default, and nothing for old reports', () => {
    const plain = chartDef({ chartType: 'breakdown' });
    expect(plain).not.toHaveProperty('columns');
    expect(plain).not.toHaveProperty('bars');
    expect(chartDef({ chartType: 'breakdown', bars: 'relative_to_largest' })).not.toHaveProperty('bars');
    expect(chartDef({ chartType: 'breakdown', columns: ['amount', 'count'], bars: 'share_of_total' })).toMatchObject({
      columns: ['amount', 'count'],
      bars: 'share_of_total',
    });
  });

  it('keeps columns and bars off every other chart type', () => {
    const d = chartDef({ chartType: 'bar', columns: ['amount'], bars: 'share_of_total' });
    expect(d).not.toHaveProperty('columns');
    expect(d).not.toHaveProperty('bars');
  });

  it('drops change when no comparison goes out, and the whole list when that empties it', () => {
    expect(chartDef({ chartType: 'breakdown', columns: ['amount', 'change'] })).toMatchObject({ columns: ['amount'] });
    expect(chartDef({ chartType: 'breakdown', columns: ['change'] })).not.toHaveProperty('columns');
    expect(chartDef({ chartType: 'breakdown', columns: ['amount', 'change'], ...comparing })).toMatchObject({ columns: ['amount', 'change'] });
  });

  it('omits columns equal to the default for the comparison sent, in any order', () => {
    expect(chartDef({ chartType: 'breakdown', columns: ['share', 'amount'] })).not.toHaveProperty('columns');
    expect(chartDef({ chartType: 'breakdown', columns: ['change', 'amount', 'share'], ...comparing })).not.toHaveProperty('columns');
    // Without a comparison the default has no change, so [amount, share] is the default and [amount, share, change] sends nothing extra.
    expect(chartDef({ chartType: 'breakdown', columns: ['amount', 'share', 'change'] })).not.toHaveProperty('columns');
    expect(chartDef({ chartType: 'breakdown', columns: ['amount'], ...comparing })).toMatchObject({ columns: ['amount'] });
  });

  it('serializes a date dimension without the change column', () => {
    const d = chartDef({ chartType: 'breakdown', dimensionField: 'date', dimensionGranularity: 'month', columns: ['change', 'amount', 'count'], ...comparing });
    expect(d).not.toHaveProperty('comparison');
    expect(d).toMatchObject({ columns: ['amount', 'count'] });
  });

  it('drops change from the draft when the dimension becomes a date, through the editor reducer', () => {
    const reduce = makeEditorReducer(catalogFixture);
    const state = chartState({ chartType: 'breakdown', columns: ['change', 'amount'], ...comparing });
    const next = reduce(state, { type: 'CHART_SET', value: { dimensionField: 'date', dimensionGranularity: 'month' } });
    expect(next.chart.columns).toEqual(['amount']);
    const only = reduce(chartState({ chartType: 'breakdown', columns: ['change'], ...comparing }), { type: 'CHART_SET', value: { dimensionField: 'date', dimensionGranularity: 'month' } });
    expect(only.chart.columns).toBeUndefined();
  });

  it('asks for at least one column', () => {
    expect(validationIssues(chartState({ chartType: 'breakdown', columns: [] }), catalog)).toEqual([
      { key: 'breakdownColumns', message: 'Select at least one column.' },
    ]);
    expect(validationIssues(chartState({ chartType: 'breakdown', columns: ['count'] }), catalog)).toEqual([]);
    expect(validationIssues(chartState({ chartType: 'breakdown' }), catalog)).toEqual([]);
  });

  it('clears both when the chart type leaves breakdown', () => {
    const state = chartState({ chartType: 'breakdown', columns: ['amount', 'count'], bars: 'share_of_total' });
    const next = builderReducer(state, { type: 'CHART_SET', value: { chartType: 'bar' } });
    expect(next.chart.columns).toBeUndefined();
    expect(next.chart.bars).toBeUndefined();
    const same = builderReducer(state, { type: 'CHART_SET', value: { limit: 5 } });
    expect(same.chart.columns).toEqual(['amount', 'count']);
  });

  it('drops change when the comparison is turned off, and falls back to the default when none is left', () => {
    const state = chartState({ chartType: 'breakdown', ...comparing, columns: ['amount', 'change'] });
    const off = builderReducer(state, { type: 'CHART_SET', value: { comparisonEnabled: false } });
    expect(off.chart.columns).toEqual(['amount']);
    const only = builderReducer(chartState({ chartType: 'breakdown', ...comparing, columns: ['change'] }), {
      type: 'CHART_SET',
      value: { comparisonEnabled: false },
    });
    expect(only.chart.columns).toBeUndefined();
  });

  it('loads saved columns and bars back into the draft', () => {
    const definition: ChartDefinition = {
      chartType: 'breakdown',
      dimension: { field: 'category' },
      measure: { field: 'spend', aggregation: 'sum' },
      filters: [],
      columns: ['amount', 'avg'],
      bars: 'share_of_total',
    };
    const state = hydrateState({ ...savedChart, definition });
    expect(state.chart).toMatchObject({ columns: ['amount', 'avg'], bars: 'share_of_total' });
    expect(serializeDefinition(state, catalog)).toEqual(definition);
  });
});

describe('validation issues carry the field they belong to', () => {
  it('maps an unfinished chart to its fields', () => {
    const state = chartState({ dimensionField: undefined, measureField: undefined, measureAggregation: undefined });
    expect(validationIssues(state, catalog).map((i) => i.key)).toEqual(['dimension', 'measure']);
  });

  it('maps an unfinished aggregated table to rows and measures', () => {
    const base = initialBuilderState('TABLE', catalog, 'transactions');
    const state = builderReducer({ ...base, type: 'TABLE' }, { type: 'TABLE_SET', value: { tableMode: 'aggregated' } });
    expect(validationIssues(state, catalog).map((i) => i.key)).toEqual(['rows', 'measures']);
  });

  it('keeps the plain messages for callers that only want text', () => {
    expect(validationErrors(chartState({ dimensionField: undefined }), catalog)).toEqual(['Select a dimension.']);
  });
});

describe('saving then opening a chart keeps every new field', () => {
  it('round-trips a definition through the draft', () => {
    const definition: ChartDefinition = {
      chartType: 'breakdown',
      dimension: { field: 'category' },
      measure: { field: 'spend', aggregation: 'sum' },
      filters: [],
      limit: 8,
      other: true,
      order: 'value_asc',
      comparison: { enabled: true, period: 'previous_period', higherIsBetter: false, display: 'previous_value' },
      subDimension: { field: 'description' },
      subLimit: 5,
    };
    const report: ReportResponse = { ...savedChart, definition };
    expect(serializeDefinition(hydrateState(report), catalog)).toEqual(definition);
  });
});
