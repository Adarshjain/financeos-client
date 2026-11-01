import { describe, expect, it } from 'vitest';

import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';

import { categoryPatch, directionOf, pickOf, savedMessage, sourceLine } from './categoryModel';

describe('categoryPatch', () => {
  it('builds the row fields for a pick, as the user set it', () => {
    expect(categoryPatch(LIST, { categoryKey: 'food', subcategoryKey: 'food.delivery' }, 'USER', '2026-11-01T10:00:00Z')).toEqual({
      category: { key: 'food', name: 'Food', icon: 'cat-fork-knife' },
      subcategory: { key: 'food.delivery', name: 'Delivery' },
      categorySource: 'USER',
      categoryRule: null,
      categorySetAt: '2026-11-01T10:00:00Z',
    });
  });

  it('leaves the sub-category out for Others', () => {
    expect(categoryPatch(LIST, { categoryKey: 'gifts', subcategoryKey: null }, 'USER', null)).toMatchObject({
      category: { key: 'gifts', name: 'Gifts' },
      subcategory: null,
    });
  });

  it('clears everything for no pick', () => {
    expect(categoryPatch(LIST, null, 'RULE', 'x')).toEqual({
      category: null,
      subcategory: null,
      categorySource: null,
      categoryRule: null,
      categorySetAt: null,
    });
  });
});

describe('pickOf, directionOf, savedMessage', () => {
  it('reads the pick a transaction holds', () => {
    expect(pickOf({ category: { key: 'food', name: 'Food', icon: 'x' }, subcategory: { key: 'food.cafes', name: 'Cafés' } })).toEqual({
      categoryKey: 'food',
      subcategoryKey: 'food.cafes',
    });
    expect(pickOf({ category: { key: 'gifts', name: 'Gifts', icon: 'x' } })).toEqual({ categoryKey: 'gifts', subcategoryKey: null });
    expect(pickOf({ category: null })).toBeNull();
  });

  it('takes a credit as money in and a debit as money out', () => {
    expect(directionOf({ amount: 500 })).toBe('IN');
    expect(directionOf({ amount: -500 })).toBe('OUT');
  });

  it('writes the toast as "Set to Category · Sub"', () => {
    expect(savedMessage(LIST, { categoryKey: 'food', subcategoryKey: 'food.delivery' })).toBe('Set to Food · Delivery');
    expect(savedMessage(LIST, { categoryKey: 'gifts', subcategoryKey: null })).toBe('Set to Gifts');
    expect(savedMessage(LIST, { categoryKey: 'nope', subcategoryKey: null })).toBe('Category set');
  });
});

describe('sourceLine', () => {
  const food = { key: 'food', name: 'Food', icon: 'x' };
  it.each([
    ['AUTO', {}, 'Set automatically from the merchant'],
    ['LINK', {}, 'Set by a link'],
    ['RULE', { categoryRule: { id: 'r1', name: 'Swiggy' } }, 'Set by the rule "Swiggy"'],
    ['RULE', {}, 'Set by a rule'],
    ['USER', { categorySetAt: '2026-11-01T10:00:00+05:30' }, 'Set by you on 01/11/26'],
    ['USER', {}, 'Set by you'],
  ] as const)('%s reads as written', (source, extra, line) => {
    expect(sourceLine({ category: food, categorySource: source, ...extra })).toBe(line);
  });

  it('says it could not tell when there is no category', () => {
    expect(sourceLine({ category: null })).toBe("We couldn't tell. Pick one, or sort similar ones together.");
  });
});
