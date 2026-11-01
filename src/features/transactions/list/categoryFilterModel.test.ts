import { describe, expect, it } from 'vitest';

import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';

import {
  categoryChipLabel,
  categoryFilterSize,
  categoryRowState,
  NO_CATEGORY_FILTER,
  subRowState,
  tagChipLabel,
  toggleCategory,
  toggleSub,
  toggleTag,
  toggleUncategorized,
  toggleUntagged,
  visibleCategories,
} from './categoryFilterModel';

const food = LIST.find((c) => c.key === 'food')!;
const groceries = LIST.find((c) => c.key === 'groceries')!;

describe('the Category filter', () => {
  it('Uncategorized replaces any category pick, and a category pick replaces Uncategorized', () => {
    const picked = toggleCategory(NO_CATEGORY_FILTER, food, LIST);
    expect(toggleUncategorized(picked)).toEqual({ uncategorized: true, categories: [], subcategories: [] });
    expect(toggleCategory({ ...NO_CATEGORY_FILTER, uncategorized: true }, food, LIST)).toEqual({
      uncategorized: false,
      categories: ['food'],
      subcategories: [],
    });
  });

  it('ticking a category includes its sub-categories', () => {
    const f = toggleCategory(NO_CATEGORY_FILTER, food, LIST);
    expect(categoryRowState(f, food)).toBe(true);
    expect(subRowState(f, food, 'food.delivery')).toBe(true);
    expect(toggleCategory(f, food, LIST)).toEqual(NO_CATEGORY_FILTER);
  });

  it('unticking one sub-category of a whole category narrows it to the others', () => {
    const f = toggleSub(toggleCategory(NO_CATEGORY_FILTER, food, LIST), food, 'food.delivery');
    expect(f.categories).toEqual([]);
    expect(f.subcategories).toEqual(['food.dining', 'food.cafes', 'food.drinks', 'food.snacks']);
    expect(categoryRowState(f, food)).toBe('indeterminate');
  });

  it('ticking a sub-category narrows to that category alone', () => {
    const whole = toggleCategory(NO_CATEGORY_FILTER, groceries, LIST);
    expect(toggleSub(whole, food, 'food.delivery')).toEqual({ uncategorized: false, categories: [], subcategories: ['food.delivery'] });
    const narrowed = toggleSub(NO_CATEGORY_FILTER, food, 'food.delivery');
    expect(toggleSub(narrowed, food, 'food.delivery')).toEqual(NO_CATEGORY_FILTER);
  });

  it('ticking a whole category over narrowed sub-categories widens those to their categories', () => {
    const narrowed = toggleSub(NO_CATEGORY_FILTER, food, 'food.delivery');
    expect(toggleCategory(narrowed, groceries, LIST)).toEqual({ uncategorized: false, categories: ['food', 'groceries'], subcategories: [] });
  });

  it('words the chip: the name for one, the count for more', () => {
    expect(categoryChipLabel(NO_CATEGORY_FILTER, LIST)).toBe('Category');
    expect(categoryChipLabel({ ...NO_CATEGORY_FILTER, uncategorized: true }, LIST)).toBe('Category · Uncategorized');
    expect(categoryChipLabel({ ...NO_CATEGORY_FILTER, categories: ['food'] }, LIST)).toBe('Category · Food');
    expect(categoryChipLabel({ ...NO_CATEGORY_FILTER, subcategories: ['food.delivery'] }, LIST)).toBe('Category · Delivery');
    expect(categoryChipLabel({ uncategorized: false, categories: ['food', 'groceries'], subcategories: [] }, LIST)).toBe('Category · 2');
    expect(categoryFilterSize({ uncategorized: true, categories: [], subcategories: [] })).toBe(1);
  });

  it('lists only categories with something in them, plus ticked ones, and searches names and sub-categories', () => {
    const counts = {
      uncategorized: 3,
      categories: [
        { categoryKey: 'food', count: 5, subs: [{ subcategoryKey: 'food.delivery', count: 5 }] },
        { categoryKey: 'transport', count: 2, subs: [{ subcategoryKey: 'transport.cabs', count: 2 }] },
      ],
    };
    expect(visibleCategories(LIST, counts, NO_CATEGORY_FILTER, '').map((r) => r.category.key)).toEqual(['food', 'transport']);
    expect(visibleCategories(LIST, counts, { ...NO_CATEGORY_FILTER, categories: ['travel'] }, '').map((r) => r.category.key)).toContain('travel');
    const found = visibleCategories(LIST, counts, NO_CATEGORY_FILTER, 'cab');
    expect(found.map((r) => r.category.key)).toEqual(['transport']);
    expect(found[0]).toMatchObject({ expand: true });
    expect(found[0].subs.map((s) => s.key)).toEqual(['transport.cabs']);
    expect(visibleCategories(LIST, null, NO_CATEGORY_FILTER, '').length).toBeGreaterThan(20);
  });
});

describe('the Tags filter', () => {
  it('Untagged replaces tags and a tag replaces Untagged', () => {
    expect(toggleUntagged({ untagged: false, tags: ['t1'] })).toEqual({ untagged: true, tags: [] });
    expect(toggleTag({ untagged: true, tags: [] }, 't1')).toEqual({ untagged: false, tags: ['t1'] });
    expect(toggleTag({ untagged: false, tags: ['t1'] }, 't1')).toEqual({ untagged: false, tags: [] });
  });

  it('words the chip', () => {
    const tags = [{ id: 't1', name: 'Goa trip' }];
    expect(tagChipLabel({ untagged: false, tags: [] }, tags)).toBe('Tags');
    expect(tagChipLabel({ untagged: true, tags: [] }, tags)).toBe('Tags · Untagged');
    expect(tagChipLabel({ untagged: false, tags: ['t1'] }, tags)).toBe('Tags · Goa trip');
    expect(tagChipLabel({ untagged: false, tags: ['t1', 't2'] }, tags)).toBe('Tags · 2');
  });
});
