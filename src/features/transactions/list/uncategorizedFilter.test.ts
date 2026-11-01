import { describe, expect, it } from 'vitest';

import { activeFilterCount, activeFilterWords } from './filterOptionsModel';
import { draftFromQuery, queryFromDraft } from './filtersDraftModel';
import { buildFilters } from './transactionsRequest';
import { DEFAULT_QUERY, parseTransactionsUrl, transactionsUrl } from './transactionsUrl';

describe('the Uncategorized filter', () => {
  it('reads uncategorized=1 from the address and writes it back', () => {
    const q = parseTransactionsUrl({ uncategorized: '1' });
    expect(q.uncategorized).toBe(true);
    expect(transactionsUrl(q)).toBe('/transactions?uncategorized=1');
    expect(parseTransactionsUrl({}).uncategorized).toBe(false);
  });
  it('sends the uncategorized flag', () => {
    expect(buildFilters({ ...DEFAULT_QUERY, uncategorized: true })).toEqual([{ field: 'uncategorized', operator: 'is', value: true }]);
  });
  it('counts as an active filter', () => {
    expect(activeFilterCount({ ...DEFAULT_QUERY, uncategorized: true })).toBe(1);
    expect(activeFilterWords({ ...DEFAULT_QUERY, uncategorized: true })).toBe('uncategorized');
  });
});

describe('Uncategorized and category picks combine', () => {
  it('keeps picked categories in the address beside uncategorized', () => {
    const q = parseTransactionsUrl({ uncategorized: '1', category: ['rent'] });
    expect(q.uncategorized).toBe(true);
    expect(q.categories).toEqual(['rent']);
  });
  it('sends both, for the server to OR', () => {
    expect(buildFilters({ ...DEFAULT_QUERY, uncategorized: true, categories: ['rent'] })).toEqual([
      { field: 'uncategorized', operator: 'is', value: true },
      { field: 'category', operator: 'is', value: 'rent' },
    ]);
  });
  it('the Filters dialog leaves uncategorized and categories alone (the Category chip owns them)', () => {
    const base = { ...DEFAULT_QUERY, uncategorized: true };
    expect(queryFromDraft(base, draftFromQuery(base)).uncategorized).toBe(true);
  });
});
