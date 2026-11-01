import { describe, expect, it } from 'vitest';

import { categoriesForDirection, categoryLabel, findCategory, findSub, pickLabel, subsForDirection } from '@/lib/categoryList';
import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';

describe('categoriesForDirection', () => {
  it('lists money out in the out order, with the both-way categories', () => {
    const out = categoriesForDirection(LIST, 'OUT').map((c) => c.key);
    expect(out.slice(0, 3)).toEqual(['food', 'groceries', 'transport']);
    expect(out).toContain('gifts');
    expect(out).toContain('self_transfer');
    expect(out).not.toContain('salary');
  });

  it('lists money in in the in order, with the both-way categories and none of the out-only ones', () => {
    const inn = categoriesForDirection(LIST, 'IN').map((c) => c.key);
    expect(inn.slice(0, 3)).toEqual(['salary', 'earnings', 'interest']);
    expect(inn).toContain('gifts');
    expect(inn).toContain('repaid');
    expect(inn).not.toContain('food');
    expect(inn).not.toContain('lent');
  });

  it('does not reorder or change the list it is given', () => {
    const before = LIST.map((c) => c.key).join();
    categoriesForDirection(LIST, 'IN');
    expect(LIST.map((c) => c.key).join()).toBe(before);
  });
});

describe('subsForDirection', () => {
  it('keeps only the sub-categories that fit the direction, in order', () => {
    const cardBill = findCategory(LIST, 'card_bill')!;
    expect(subsForDirection(cardBill, 'OUT').map((s) => s.name)).toEqual(['Credit card', 'Pay later']);
    expect(subsForDirection(cardBill, 'IN')).toEqual([]);
    expect(subsForDirection(findCategory(LIST, 'food')!, 'OUT')[1].name).toBe('Delivery');
  });
});

describe('lookups and labels', () => {
  it('finds a category and a sub by key, and null for an unknown or missing key', () => {
    const food = findCategory(LIST, 'food');
    expect(food?.name).toBe('Food');
    expect(findSub(food, 'food.delivery')?.name).toBe('Delivery');
    expect(findCategory(LIST, 'nope')).toBeNull();
    expect(findCategory(LIST, null)).toBeNull();
    expect(findSub(food, 'nope')).toBeNull();
    expect(findSub(null, 'food.delivery')).toBeNull();
  });

  it('writes "Category · Sub", or the category alone', () => {
    expect(categoryLabel('Food', 'Delivery')).toBe('Food · Delivery');
    expect(categoryLabel('Gifts')).toBe('Gifts');
    expect(categoryLabel('Gifts', null)).toBe('Gifts');
    expect(pickLabel(LIST, { categoryKey: 'food', subcategoryKey: 'food.delivery' })).toBe('Food · Delivery');
    expect(pickLabel(LIST, { categoryKey: 'food', subcategoryKey: null })).toBe('Food');
    expect(pickLabel(LIST, { categoryKey: 'nope', subcategoryKey: null })).toBe('');
    expect(pickLabel(LIST, null)).toBe('');
  });
});
