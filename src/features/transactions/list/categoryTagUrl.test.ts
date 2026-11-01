import { describe, expect, it } from 'vitest';

import { activeFilterCount, activeFilterWords } from './filterOptionsModel';
import { buildFilters } from './transactionsRequest';
import { DEFAULT_QUERY, parseTransactionsUrl, remapLegacyCategoryParams, transactionsUrl } from './transactionsUrl';

describe('category, sub-category, tag and untagged in the address', () => {
  it('round-trips every one', () => {
    const q = parseTransactionsUrl({ category: ['food', 'groceries'], subcategory: 'transport.cabs', tag: ['t1', 't2'] });
    expect(q).toMatchObject({ categories: ['food', 'groceries'], subcategories: ['transport.cabs'], tags: ['t1', 't2'] });
    expect(transactionsUrl(q)).toBe('/transactions?category=food&category=groceries&subcategory=transport.cabs&tag=t1&tag=t2');
    expect(parseTransactionsUrl({ untagged: '1' }).untagged).toBe(true);
    expect(transactionsUrl({ ...DEFAULT_QUERY, untagged: true })).toBe('/transactions?untagged=1');
  });

  it('keeps uncategorized beside categories and untagged beside tags', () => {
    const q = parseTransactionsUrl({ uncategorized: '1', category: 'food', subcategory: 'food.dining', untagged: '1', tag: 't1' });
    expect(q).toMatchObject({ uncategorized: true, categories: ['food'], subcategories: ['food.dining'], untagged: true, tags: ['t1'] });
    expect(transactionsUrl(q)).toBe('/transactions?category=food&subcategory=food.dining&uncategorized=1&tag=t1&untagged=1');
  });
});

describe('the list request', () => {
  it('sends category and sub-category keys and tag ids as is / in clauses', () => {
    expect(buildFilters({ ...DEFAULT_QUERY, categories: ['food'], subcategories: ['transport.cabs', 'transport.autos'], tags: ['t1'] })).toEqual([
      { field: 'category', operator: 'is', value: 'food' },
      { field: 'subcategory', operator: 'in', value: ['transport.cabs', 'transport.autos'] },
      { field: 'tag', operator: 'is', value: 't1' },
    ]);
  });

  it('sends Untagged as the untagged flag, beside the tags', () => {
    expect(buildFilters({ ...DEFAULT_QUERY, untagged: true })).toEqual([{ field: 'untagged', operator: 'is', value: true }]);
    expect(buildFilters({ ...DEFAULT_QUERY, untagged: true, tags: ['t1'] })).toEqual([
      { field: 'untagged', operator: 'is', value: true },
      { field: 'tag', operator: 'is', value: 't1' },
    ]);
  });

  it('counts and words the new filters', () => {
    const q = { ...DEFAULT_QUERY, subcategories: ['food.dining'], tags: ['t1', 't2'] };
    expect(activeFilterCount(q)).toBe(2);
    expect(activeFilterCount({ ...DEFAULT_QUERY, untagged: true })).toBe(1);
    expect(activeFilterWords(q)).toBe('1 category · 2 tags');
    expect(activeFilterWords({ ...DEFAULT_QUERY, untagged: true })).toBe('untagged');
  });
});

describe('the filter count', () => {
  it('counts Uncategorized with categories or sub-categories as one filter, and Untagged with tags as one', () => {
    expect(activeFilterCount({ ...DEFAULT_QUERY, uncategorized: true, categories: ['food'], subcategories: ['food.dining'] })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_QUERY, untagged: true, tags: ['t1', 't2'] })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_QUERY, uncategorized: true, categories: ['food'], untagged: true, tags: ['t1'] })).toBe(2);
    expect(activeFilterCount({ ...DEFAULT_QUERY, categories: ['food', 'groceries'] })).toBe(1);
  });
});

describe('old category links', () => {
  const keys = ['food', 'groceries'];
  const tags = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Goa trip' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Work' },
  ];

  it('turns a tag name or id into a tag and keeps real category keys', () => {
    const next = remapLegacyCategoryParams({ category: ['Goa trip', 'food', '22222222-2222-2222-2222-222222222222'] }, keys, tags);
    expect(next.category).toEqual(['food']);
    expect(next.tag).toEqual(['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']);
    expect(parseTransactionsUrl(next)).toMatchObject({ categories: ['food'], tags: [tags[0].id, tags[1].id] });
  });

  it('drops a value no tag matches, and leaves addresses without a category alone', () => {
    expect(remapLegacyCategoryParams({ category: 'Nope' }, keys, tags)).toMatchObject({ category: undefined, tag: undefined });
    const plain = { q: 'swiggy' };
    expect(remapLegacyCategoryParams(plain, keys, tags)).toBe(plain);
  });

  it('leaves the address alone when the category list or the tags could not be loaded, never dropping a valid key', () => {
    const params = { category: ['food', 'Goa trip'] };
    expect(remapLegacyCategoryParams(params, null, tags)).toBe(params);
    expect(remapLegacyCategoryParams(params, keys, null)).toBe(params);
    expect(parseTransactionsUrl(remapLegacyCategoryParams(params, null, null)).categories).toEqual(['food', 'Goa trip']);
  });

  it('keeps tags already in the address', () => {
    const next = remapLegacyCategoryParams({ category: 'Work', tag: tags[0].id }, keys, tags);
    expect(next.tag).toEqual([tags[0].id, tags[1].id]);
  });
});
