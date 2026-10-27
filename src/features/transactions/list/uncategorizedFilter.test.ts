import { describe, expect, it } from 'vitest';

import { activeFilterCount, activeFilterWords } from './filterOptions';
import { draftFromQuery, queryFromDraft } from './filtersDraft';
import { buildFilters } from './transactionsRequest';
import { DEFAULT_QUERY, parseTransactionsUrl, transactionsUrl } from './transactionsUrl';

describe('the Uncategorized filter', () => {
  it('reads uncategorized=1 from the address and writes it back', () => {
    const q = parseTransactionsUrl({ uncategorized: '1' });
    expect(q.uncategorized).toBe(true);
    expect(transactionsUrl(q)).toBe('/transactions?uncategorized=1');
    expect(parseTransactionsUrl({}).uncategorized).toBe(false);
  });
  it('sends the valueless is_empty clause on category', () => {
    expect(buildFilters({ ...DEFAULT_QUERY, uncategorized: true })).toEqual([{ field: 'category', operator: 'is_empty' }]);
  });
  it('counts as an active filter', () => {
    expect(activeFilterCount({ ...DEFAULT_QUERY, uncategorized: true })).toBe(1);
    expect(activeFilterWords({ ...DEFAULT_QUERY, uncategorized: true })).toBe('uncategorized');
  });
});

describe('Uncategorized and category picks are exclusive', () => {
  it('drops picked categories from the address when uncategorized is set', () => {
    const q = parseTransactionsUrl({ uncategorized: '1', category: ['Rent'] });
    expect(q.uncategorized).toBe(true);
    expect(q.categories).toEqual([]);
  });
  it('sends only is_empty if both ever reach the request', () => {
    expect(buildFilters({ ...DEFAULT_QUERY, uncategorized: true, categories: ['Rent'] })).toEqual([
      { field: 'category', operator: 'is_empty' },
    ]);
  });
  it('picking categories in the Filters dialog clears uncategorized, and keeping none keeps it', () => {
    const base = { ...DEFAULT_QUERY, uncategorized: true };
    const draft = draftFromQuery(base);
    expect(queryFromDraft(base, { ...draft, categories: ['Rent'] }).uncategorized).toBe(false);
    expect(queryFromDraft(base, draft).uncategorized).toBe(true);
  });
});
