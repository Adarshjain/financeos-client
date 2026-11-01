import type { CategoryDef, CategoryPick, CategorySub } from '@/lib/categoryList.types';

/** Money out (a debit) or money in (a credit): decides which categories the list offers. */
export type MoneyDirection = 'OUT' | 'IN';

/** What the picker can offer: money out, money in, or both at once (the rule form, where a rule has no direction). */
export type PickerDirection = MoneyDirection | 'ANY';

/** The categories offered for a direction, in the list's order for it (BOTH-direction ones included). */
export function categoriesForDirection(list: readonly CategoryDef[], direction: PickerDirection): CategoryDef[] {
  if (direction === 'ANY') {
    // The money-out list in its order, then the categories only money in has, in theirs; a both-way category shows once.
    const out = categoriesForDirection(list, 'OUT');
    const seen = new Set(out.map((c) => c.key));
    return [...out, ...categoriesForDirection(list, 'IN').filter((c) => !seen.has(c.key))];
  }
  const order = (c: CategoryDef) => (direction === 'OUT' ? c.outOrder : c.inOrder);
  return list
    .filter((c) => (c.direction === 'BOTH' || c.direction === direction) && order(c) != null)
    .sort((a, b) => (order(a) ?? 0) - (order(b) ?? 0));
}

/** Recent picks of money out and money in as one line: alternating, each pick once, at most `max`. */
export function mergeRecentPicks(out: readonly CategoryPick[], inn: readonly CategoryPick[], max = 4): CategoryPick[] {
  const merged: CategoryPick[] = [];
  for (let i = 0; i < Math.max(out.length, inn.length); i += 1) {
    for (const pick of [out[i], inn[i]]) {
      if (!pick) continue;
      const same = merged.some((m) => m.categoryKey === pick.categoryKey && (m.subcategoryKey ?? null) === (pick.subcategoryKey ?? null));
      if (!same) merged.push(pick);
    }
  }
  return merged.slice(0, max);
}

/** The sub-categories of a category that apply to a direction, in order. */
export function subsForDirection(category: CategoryDef, direction: PickerDirection): CategorySub[] {
  return category.subs
    .filter((s) => direction === 'ANY' || s.direction === 'BOTH' || s.direction === direction)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function findCategory(list: readonly CategoryDef[], key: string | null | undefined): CategoryDef | null {
  return key ? (list.find((c) => c.key === key) ?? null) : null;
}

export function findSub(category: CategoryDef | null, key: string | null | undefined): CategorySub | null {
  return category && key ? (category.subs.find((s) => s.key === key) ?? null) : null;
}

/** "Food · Delivery", or just "Food" when there is no sub-category. */
export function categoryLabel(categoryName: string, subName?: string | null): string {
  return subName ? `${categoryName} · ${subName}` : categoryName;
}

/** The label of a pick, looked up in the list; empty when the category is unknown. */
export function pickLabel(list: readonly CategoryDef[], pick: CategoryPick | null | undefined): string {
  const category = findCategory(list, pick?.categoryKey);
  if (!category) return '';
  return categoryLabel(category.name, findSub(category, pick?.subcategoryKey)?.name);
}
