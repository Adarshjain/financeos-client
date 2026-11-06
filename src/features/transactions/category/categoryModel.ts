import { categoryLabel, findCategory, findSub } from '@/lib/categoryList';
import type { CategoryDef, CategoryPick, CategorySource } from '@/lib/categoryList.types';
import { formatDate } from '@/lib/format';
import type { Transaction } from '@/lib/transaction.types';

/** The category fields a transaction carries after a pick (or a clear): what the row and detail show before the server answers. */
export function categoryPatch(
  list: readonly CategoryDef[],
  pick: CategoryPick | null,
  source: CategorySource | null,
  setAt: string | null,
): Partial<Transaction> {
  const category = findCategory(list, pick?.categoryKey);
  const sub = findSub(category, pick?.subcategoryKey);
  return {
    category: category ? { key: category.key, name: category.name, icon: category.icon } : null,
    subcategory: sub ? { key: sub.key, name: sub.name } : null,
    categorySource: category ? source : null,
    categoryRule: null,
    categorySetAt: category ? setAt : null,
  };
}

/** The pick a transaction holds now, or null when it has no category. */
export function pickOf(t: Pick<Transaction, 'category' | 'subcategory'>): CategoryPick | null {
  return t.category ? { categoryKey: t.category.key, subcategoryKey: t.subcategory?.key ?? null } : null;
}

/** "Set to Food · Delivery": the saved toast. */
export function savedMessage(list: readonly CategoryDef[], pick: CategoryPick): string {
  const category = findCategory(list, pick.categoryKey);
  if (!category) return 'Category set';
  return `Set to ${categoryLabel(category.name, findSub(category, pick.subcategoryKey)?.name)}`;
}

/** The picker works on money out for a debit and money in for a credit (a credit has a positive amount). */
export function directionOf(t: Pick<Transaction, 'amount'>): 'OUT' | 'IN' {
  return t.amount != null && t.amount > 0 ? 'IN' : 'OUT';
}

/** The line under the Category row of the detail: where the category came from. */
export function sourceLine(
  t: Pick<Transaction, 'category' | 'categorySource' | 'categoryRule' | 'categorySetAt'>,
): string {
  if (!t.category) return "We couldn't tell. Pick one, or sort similar ones together.";
  switch (t.categorySource) {
    case 'AUTO':
      return 'Set automatically from the merchant';
    case 'LINK':
      return 'Set by a link';
    case 'RULE':
      return t.categoryRule?.name ? `Set by the rule "${t.categoryRule.name}"` : 'Set by a rule';
    case 'USER':
      return t.categorySetAt ? `Set by you on ${formatDate(t.categorySetAt, 'input')}` : 'Set by you';
    default:
      return '';
  }
}
