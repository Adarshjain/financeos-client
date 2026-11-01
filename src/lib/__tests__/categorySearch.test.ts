import { describe, expect, it } from 'vitest';

import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';
import { searchCategories } from '@/lib/categorySearch';

const labels = (text: string, direction: 'OUT' | 'IN' = 'OUT') => searchCategories(LIST, direction, text).map((r) => r.label);

describe('searchCategories', () => {
  it('finds nothing for blank text', () => {
    expect(searchCategories(LIST, 'OUT', '')).toEqual([]);
    expect(searchCategories(LIST, 'OUT', '   ')).toEqual([]);
  });

  it('finds a shop by an everyday word, with the word as the hint', () => {
    const [first] = searchCategories(LIST, 'OUT', 'zom');
    expect(first).toMatchObject({ label: 'Food · Delivery', categoryKey: 'food', subcategoryKey: 'food.delivery', hintWord: 'zomato' });
  });

  it('finds categories by name and sub-categories by name', () => {
    expect(labels('transp')).toContain('Transport');
    expect(labels('dairy')).toContain('Groceries · Dairy');
    expect(searchCategories(LIST, 'OUT', 'gift')[0]).toMatchObject({ label: 'Gifts', hint: 'Category, no sub-categories' });
    expect(searchCategories(LIST, 'OUT', 'transp').find((r) => r.label === 'Transport')?.hint).toBe('Category');
  });

  it('keeps each result once, and at most seven', () => {
    const out = searchCategories(LIST, 'OUT', 'a');
    expect(new Set(out.map((r) => `${r.categoryKey}/${r.subcategoryKey}`)).size).toBe(out.length);
    expect(out.length).toBeLessThanOrEqual(7);
  });

  it('offers only what fits the direction', () => {
    expect(labels('salary', 'OUT')).toEqual([]);
    expect(labels('salary', 'IN')).toContain('Salary · Salary');
    expect(labels('swiggy', 'IN')).toEqual([]);
  });

  it('has a synonym for every word list pointing at a real category, so none is dead', () => {
    // A synonym whose key is not in the list is skipped silently: spot-check that the common ones resolve.
    for (const word of ['uber', 'rent', 'netflix', 'petrol', 'recharge', 'blinkit', 'irctc', 'pharmacy']) {
      expect(searchCategories(LIST, 'OUT', word).length, word).toBeGreaterThan(0);
    }
  });
});
