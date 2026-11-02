import { describe, expect, it } from 'vitest';

import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';

import {
  categoryChipLabel,
  categoryFieldValue,
  categoryFilterFromField,
  categoryFilterSize,
  categoryRowState,
  categorySubtitle,
  NO_CATEGORY_FILTER,
  subRowState,
  tagChipLabel,
  tagFieldValue,
  tagFilterFromField,
  toggleCategory,
  toggleSub,
  toggleTag,
  toggleUncategorized,
  toggleUntagged,
  UNCATEGORIZED_VALUE,
  UNTAGGED_VALUE,
  visibleCategories,
} from './categoryFilterModel';

const food = LIST.find((c) => c.key === 'food')!;
const groceries = LIST.find((c) => c.key === 'groceries')!;

describe('the Category filter', () => {
  it('Uncategorized sits beside category picks instead of replacing them', () => {
    const picked = toggleCategory(NO_CATEGORY_FILTER, food);
    expect(toggleUncategorized(picked)).toEqual({ uncategorized: true, categories: ['food'], subcategories: [] });
    expect(toggleUncategorized({ uncategorized: true, categories: ['food'], subcategories: [] })).toEqual(picked);
  });

  it('ticking a category includes its sub-categories', () => {
    const f = toggleCategory(NO_CATEGORY_FILTER, food);
    expect(categoryRowState(f, food)).toBe(true);
    expect(subRowState(f, food, 'food.delivery')).toBe(true);
    expect(toggleCategory(f, food)).toEqual(NO_CATEGORY_FILTER);
  });

  it('unticking one sub-category of a whole category narrows it to the others', () => {
    const f = toggleSub(toggleCategory(NO_CATEGORY_FILTER, food), food, 'food.delivery');
    expect(f.categories).toEqual(['food']);
    expect(f.subcategories).toEqual(['food.dining', 'food.cafes', 'food.drinks', 'food.snacks']);
    expect(categoryRowState(f, food)).toBe('indeterminate');
    expect(subRowState(f, food, 'food.delivery')).toBe(false);
    expect(subRowState(f, food, 'food.dining')).toBe(true);
  });

  it('ticking a sub-category of an unticked category ticks the category narrowed to it, beside other categories', () => {
    const whole = toggleCategory(NO_CATEGORY_FILTER, groceries);
    expect(toggleSub(whole, food, 'food.delivery')).toEqual({ uncategorized: false, categories: ['groceries', 'food'], subcategories: ['food.delivery'] });
  });

  it('ticking every sub-category makes the category whole, and unticking the last one unticks it', () => {
    let f = NO_CATEGORY_FILTER;
    for (const s of food.subs) f = toggleSub(f, food, s.key);
    expect(f).toEqual({ uncategorized: false, categories: ['food'], subcategories: [] });
    const one = toggleSub(NO_CATEGORY_FILTER, food, 'food.delivery');
    expect(toggleSub(one, food, 'food.delivery')).toEqual(NO_CATEGORY_FILTER);
  });

  it('ticking a whole category over its narrowing makes it whole; unticking it drops the narrowing', () => {
    const narrowed = toggleSub(NO_CATEGORY_FILTER, food, 'food.delivery');
    expect(toggleCategory(narrowed, food)).toEqual(NO_CATEGORY_FILTER);
  });

  it('words the row subtitle: All n, or k of n when narrowed, none when unticked', () => {
    expect(categorySubtitle(NO_CATEGORY_FILTER, food)).toBeUndefined();
    expect(categorySubtitle(toggleCategory(NO_CATEGORY_FILTER, food), food)).toBe('All 5 sub-categories');
    expect(categorySubtitle(toggleSub(NO_CATEGORY_FILTER, food, 'food.delivery'), food)).toBe('1 of 5 sub-categories');
    expect(categorySubtitle(toggleCategory(NO_CATEGORY_FILTER, LIST.find((c) => c.key === 'gifts')!), LIST.find((c) => c.key === 'gifts')!)).toBeUndefined();
  });

  it('words the chip: the name for one, the count for more', () => {
    expect(categoryChipLabel(NO_CATEGORY_FILTER, LIST)).toBe('Category');
    expect(categoryChipLabel({ ...NO_CATEGORY_FILTER, uncategorized: true }, LIST)).toBe('Category · Uncategorized');
    expect(categoryChipLabel({ ...NO_CATEGORY_FILTER, categories: ['food'] }, LIST)).toBe('Category · Food');
    expect(categoryChipLabel(toggleSub(NO_CATEGORY_FILTER, food, 'food.delivery'), LIST)).toBe('Category · Delivery');
    expect(categoryChipLabel({ uncategorized: true, categories: ['food'], subcategories: ['food.delivery'] }, LIST)).toBe('Category · 2');
    expect(categoryFilterSize({ uncategorized: true, categories: ['food', 'groceries'], subcategories: ['food.delivery'] }, LIST)).toBe(3);
  });

  it('lists every category, and searches names and sub-categories', () => {
    expect(visibleCategories(LIST, '').length).toBe(LIST.length);
    const found = visibleCategories(LIST, 'cab');
    expect(found.map((r) => r.category.key)).toEqual(['transport']);
    expect(found[0]).toMatchObject({ expand: true });
    expect(found[0].subs.map((s) => s.key)).toEqual(['transport.cabs']);
  });
});

describe('the Tags filter', () => {
  it('Untagged sits beside tags', () => {
    expect(toggleUntagged({ untagged: false, tags: ['t1'] })).toEqual({ untagged: true, tags: ['t1'] });
    expect(toggleTag({ untagged: true, tags: [] }, 't1')).toEqual({ untagged: true, tags: ['t1'] });
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

describe('category field value', () => {
  const list = LIST;
  it('maps a whole category, a narrowed one and Uncategorized to a flat list and back', () => {
    const f = { uncategorized: true, categories: ['food', 'transport'], subcategories: ['food.delivery'] };
    const value = categoryFieldValue(f, list);
    expect(value).toEqual([UNCATEGORIZED_VALUE, 'food.delivery', 'transport']);
    expect(categoryFilterFromField(value, list)).toEqual(f);
  });
  it('maps tags the same way', () => {
    expect(tagFieldValue({ untagged: true, tags: ['t1'] })).toEqual([UNTAGGED_VALUE, 't1']);
    expect(tagFilterFromField([UNTAGGED_VALUE, 't1'])).toEqual({ untagged: true, tags: ['t1'] });
  });
});
