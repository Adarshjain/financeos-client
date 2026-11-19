import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { initialBuilderState } from './builderReducerModel';
import { catalogFixture } from './editor.fixtures';
import { workingCatalog } from './editorStateModel';
import { DimensionPicker, TAG_SPLIT_NOTE } from './pickers';
import { ChartOptions, TableOptions } from './typeOptions';

const catalog = workingCatalog(catalogFixture, 'transactions');
const NOTE = 'A transaction with more than one tag is counted under each tag.';

describe('the tag split note', () => {
  it('has the agreed wording', () => {
    expect(TAG_SPLIT_NOTE).toBe(NOTE);
  });

  it('shows under a dimension, series or table group picked as Tag', () => {
    render(<DimensionPicker catalog={catalog} type="CHART" label="Series" value={{ field: 'tag' }} onChange={vi.fn()} />);
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  it.each(['category', 'subcategory', 'type', 'date'])('shows nothing for %s', (field) => {
    render(<DimensionPicker catalog={catalog} type="CHART" label="Series" value={{ field, granularity: field === 'date' ? 'month' : undefined }} onChange={vi.fn()} />);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('shows nothing when no field is chosen', () => {
    render(<DimensionPicker catalog={catalog} type="CHART" label="Series" value={{}} onChange={vi.fn()} />);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  const chart = (patch: Partial<ReturnType<typeof initialBuilderState>['chart']>) => ({
    ...initialBuilderState('CHART', catalog),
    type: 'CHART' as const,
    chart: { chartType: 'bar' as const, ...patch },
  });
  const view = (state: ReturnType<typeof chart>) => render(<ChartOptions catalog={catalog} state={state} dispatch={vi.fn()} issues={{}} />);

  it('shows once under the chart dimension when it is Tag', () => {
    view(chart({ dimensionField: 'tag' }));
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it('shows under the series when it is Tag', () => {
    view(chart({ dimensionField: 'category', seriesField: 'tag' }));
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it('shows under the breakdown sub-rows when they are Tag', () => {
    view(chart({ chartType: 'breakdown', dimensionField: 'category', subDimensionField: 'tag' }));
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it('shows nothing on a chart that does not split by Tag', () => {
    view(chart({ chartType: 'breakdown', dimensionField: 'category', subDimensionField: 'subcategory' }));
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  const table = (agg: Partial<ReturnType<typeof initialBuilderState>['table']['agg']>) => {
    const base = initialBuilderState('TABLE', catalog);
    return { ...base, type: 'TABLE' as const, table: { ...base.table, tableMode: 'aggregated' as const, agg: { ...base.table.agg, ...agg } } };
  };
  const viewTable = (state: ReturnType<typeof table>) => render(<TableOptions catalog={catalog} state={state} dispatch={vi.fn()} issues={{}} />);

  it('shows under a table group-by picked as Tag', () => {
    viewTable(table({ rows: [{ id: 'r1', field: 'tag' }] }));
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it('shows under a pivot column picked as Tag', () => {
    viewTable(table({ rows: [{ id: 'r1', field: 'category' }], columns: [{ id: 'c1', field: 'tag' }] }));
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it('shows nothing on a table grouped and pivoted by other fields', () => {
    viewTable(table({ rows: [{ id: 'r1', field: 'category' }], columns: [{ id: 'c1', field: 'type' }] }));
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });
});
