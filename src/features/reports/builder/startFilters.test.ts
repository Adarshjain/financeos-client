import { describe, expect, it } from 'vitest';

import { builderReducer, hydrateState, initialBuilderState } from './builderReducerModel';
import { startFilters } from './catalog';
import { catalogFixture, catalogWithCountsFixture, savedChart } from './editor.fixtures';
import { initialEditorState, makeEditorReducer, workingCatalog } from './editorStateModel';

const counts = { field: 'countsInTotals', operator: 'is', value: true };
const excluded = { field: 'isExcluded', operator: 'is', value: false };

const withCounts = (ds: string) => workingCatalog(catalogWithCountsFixture, ds);
const without = (ds: string) => workingCatalog(catalogFixture, ds);

describe('startFilters', () => {
  it('is "counts as spend or income" on transactions when the catalog has the field', () => {
    expect(startFilters(withCounts('transactions'), 'transactions')).toEqual([counts]);
  });

  it('falls back to hiding excluded transactions when the catalog lacks the field', () => {
    expect(startFilters(without('transactions'), 'transactions')).toEqual([excluded]);
  });

  it('is empty on any other datasource', () => {
    expect(startFilters(withCounts('dividends'), 'dividends')).toEqual([]);
    expect(startFilters(withCounts('transactions'), 'dividends')).toEqual([]);
  });

  it('is empty without a catalog', () => {
    expect(startFilters(undefined, 'transactions')).toEqual([]);
  });
});

describe('a new blank report', () => {
  it('starts on transactions with the counts filter as an ordinary removable filter', () => {
    const state = initialEditorState({ catalog: catalogWithCountsFixture });
    expect(state).toMatchObject({ mode: 'create', datasource: 'transactions', filters: [counts] });
    const removed = builderReducer(state, { type: 'REMOVE_FILTER', index: 0 });
    expect(removed.filters).toEqual([]);
  });

  it('keeps the old default when the catalog has no such field', () => {
    expect(initialEditorState({ catalog: catalogFixture }).filters).toEqual([excluded]);
  });

  it('starts with no filter on another datasource', () => {
    expect(initialBuilderState('KPI', withCounts('dividends'), 'dividends').filters).toEqual([]);
  });

  it('does not touch a saved report when it is opened', () => {
    const state = initialEditorState({ catalog: catalogWithCountsFixture, report: savedChart });
    expect(state.filters).toEqual([excluded]);
    expect(hydrateState(savedChart).filters).toEqual([excluded]);
  });

  it('does not add the filter to a template, which brings its own', () => {
    const dividends = initialEditorState({ catalog: catalogWithCountsFixture, templateId: 'dividend-income-by-fy' });
    expect(dividends.filters).toEqual([]);
    const spend = initialEditorState({ catalog: catalogWithCountsFixture, templateId: 'spend-vs-last-month-by-category' });
    expect(spend.filters.filter((f) => f.field === 'countsInTotals')).toHaveLength(1);
  });
});

describe('switching the datasource of a blank draft', () => {
  const reduce = makeEditorReducer(catalogWithCountsFixture);
  const start = () => initialEditorState({ catalog: catalogWithCountsFixture });

  it('does not carry the filter to another datasource', () => {
    const next = reduce(start(), { type: 'SET_DATASOURCE', value: 'dividends', catalog: withCounts('dividends') });
    expect(next.datasource).toBe('dividends');
    expect(next.filters).toEqual([]);
  });

  it('starts the filter again when switching back to transactions', () => {
    const away = reduce(start(), { type: 'SET_DATASOURCE', value: 'dividends', catalog: withCounts('dividends') });
    const back = reduce(away, { type: 'SET_DATASOURCE', value: 'transactions', catalog: withCounts('transactions') });
    expect(back.filters).toEqual([counts]);
  });

  it('drops a filter the user removed when the datasource changes and returns', () => {
    const removed = builderReducer(start(), { type: 'REMOVE_FILTER', index: 0 });
    const away = reduce(removed, { type: 'SET_DATASOURCE', value: 'dividends', catalog: withCounts('dividends') });
    expect(away.filters).toEqual([]);
  });

  it('starts transactions with no filter when the action carries no catalog', () => {
    const next = builderReducer(start(), { type: 'SET_DATASOURCE', value: 'transactions' });
    expect(next.filters).toEqual([]);
  });
});
