import type { CategoryDef, CategoryPick, CategorySub } from '@/lib/categoryList.types';

/** Money out (a debit) or money in (a credit): decides which categories the list offers. */
export type MoneyDirection = 'OUT' | 'IN';

/** The categories offered for a direction, in the list's order for it (BOTH-direction ones included). */
export function categoriesForDirection(list: readonly CategoryDef[], direction: MoneyDirection): CategoryDef[] {
  const order = (c: CategoryDef) => (direction === 'OUT' ? c.outOrder : c.inOrder);
  return list
    .filter((c) => (c.direction === 'BOTH' || c.direction === direction) && order(c) != null)
    .sort((a, b) => (order(a) ?? 0) - (order(b) ?? 0));
}

/** The sub-categories of a category that apply to a direction, in order. */
export function subsForDirection(category: CategoryDef, direction: MoneyDirection): CategorySub[] {
  return category.subs
    .filter((s) => s.direction === 'BOTH' || s.direction === direction)
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
