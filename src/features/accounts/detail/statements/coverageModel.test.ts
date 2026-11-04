import { describe, expect, it } from 'vitest';

import { buildCoverageModel, type CoverageData } from './coverageModel';

const coverage: CoverageData = {
  months: [
    { month: '2025-11', state: 'EMPTY' },
    { month: '2025-12', state: 'DATA' },
    { month: '2026-01', state: 'FETCHING' },
    { month: '2026-02', state: 'MARKED_EMPTY' },
  ],
};

describe('buildCoverageModel', () => {
  const model = buildCoverageModel(coverage);

  it('groups months by year in the given order', () => {
    expect(model.years.map((y) => [y.year, y.cells.map((c) => c.label)])).toEqual([
      ['2025', ['Nov', 'Dec']],
      ['2026', ['Jan', 'Feb']],
    ]);
  });

  it('maps each state to a cell kind', () => {
    expect(model.years.flatMap((y) => y.cells.map((c) => c.kind))).toEqual(['empty', 'data', 'fetching', 'marked']);
  });

  it('offers actions only where they make sense', () => {
    expect(model.years.flatMap((y) => y.cells.map((c) => c.actions))).toEqual([
      ['upload', 'mark-empty'],
      [],
      [],
      ['unmark'],
    ]);
  });

  it('has a legend of data, nothing found and fetching', () => {
    expect(model.legend.map((l) => l.kind)).toEqual(['data', 'empty', 'fetching']);
  });

  it('is empty without months', () => {
    expect(buildCoverageModel({ months: [] }).years).toEqual([]);
  });
});
