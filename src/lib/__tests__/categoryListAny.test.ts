import { describe, expect, it } from 'vitest';

import { categoriesForDirection, mergeRecentPicks, subsForDirection } from '@/lib/categoryList';
import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';

describe('the ANY direction (the rule form)', () => {
  const any = categoriesForDirection(LIST, 'ANY');
  const out = categoriesForDirection(LIST, 'OUT');
  const inn = categoriesForDirection(LIST, 'IN');

  it('is the money-out list in its order, then the money-in-only categories in theirs', () => {
    expect(any.slice(0, out.length).map((c) => c.key)).toEqual(out.map((c) => c.key));
    const inOnly = inn.filter((c) => !out.some((o) => o.key === c.key));
    expect(any.slice(out.length).map((c) => c.key)).toEqual(inOnly.map((c) => c.key));
    expect(any.map((c) => c.key)).toContain('salary');
  });

  it('shows a both-way category once', () => {
    const keys = any.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((k) => k === 'gifts')).toHaveLength(1);
  });

  it('offers every sub-category whatever its direction', () => {
    const food = LIST.find((c) => c.key === 'food')!;
    expect(subsForDirection(food, 'ANY').map((s) => s.key)).toEqual(food.subs.map((s) => s.key));
  });
});

describe('mergeRecentPicks', () => {
  const p = (categoryKey: string, subcategoryKey: string | null = null) => ({ categoryKey, subcategoryKey });
  it('alternates money out and in, drops repeats and stops at four', () => {
    const merged = mergeRecentPicks([p('food'), p('gifts'), p('bills', 'bills.rent')], [p('salary'), p('gifts'), p('refund')]);
    expect(merged).toEqual([p('food'), p('salary'), p('gifts'), p('bills', 'bills.rent')]);
  });
  it('works with one side empty', () => {
    expect(mergeRecentPicks([], [p('salary')])).toEqual([p('salary')]);
    expect(mergeRecentPicks([], [])).toEqual([]);
  });
  it('treats a missing sub-category and null as the same pick', () => {
    expect(mergeRecentPicks([{ categoryKey: 'gifts' } as never], [p('gifts')])).toHaveLength(1);
  });
});
