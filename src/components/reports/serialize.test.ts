import { describe, expect, it } from 'vitest';

import type { DatasourceCatalog } from '@/lib/reports.types';

import type { BuilderState } from './builderReducer';
import { initialBuilderState } from './builderReducer';
import { validationErrors } from './serialize';

// Minimal catalog: `date` is the only date-typed field, which is what
// isDateFieldName keys the granularity rules off.
const catalog = {
  operators: {
    number: ['equals'],
    string: ['exact'],
    enum: ['is'],
    boolean: ['is'],
    date: { absolute: ['is'], relative: ['all_time'] },
  },
  fields: [
    { name: 'amount', label: 'Amount', type: 'number', role: 'measure', allowedInReports: ['TABLE'] },
    { name: 'date', label: 'Date', type: 'date', role: 'dimension', allowedInReports: ['TABLE'] },
    { name: 'category', label: 'Category', type: 'enum', role: 'dimension', allowedInReports: ['TABLE'] },
    { name: 'accountId', label: 'Account', type: 'enum', role: 'dimension', allowedInReports: ['TABLE'] },
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
