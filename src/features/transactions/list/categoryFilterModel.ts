import type { CategoryDef } from '@/lib/categoryList.types';
import type { CategoryCounts } from '@/lib/uncategorized.types';

/** What the Category filter holds: no category, whole categories (a key includes its sub-categories), or narrowed sub-categories. */
export interface CategoryFilter {
  uncategorized: boolean;
  categories: string[];
  subcategories: string[];
}

export const NO_CATEGORY_FILTER: CategoryFilter = { uncategorized: false, categories: [], subcategories: [] };

export function categoryFilterOf(q: Pick<CategoryFilter, 'uncategorized' | 'categories' | 'subcategories'>): CategoryFilter {
  return { uncategorized: q.uncategorized, categories: q.categories, subcategories: q.subcategories };
}

export function sameCategoryFilter(a: CategoryFilter, b: CategoryFilter): boolean {
  const same = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return a.uncategorized === b.uncategorized && same(a.categories, b.categories) && same(a.subcategories, b.subcategories);
}

/** How many things are ticked: Uncategorized, each whole category and each narrowed sub-category. */
export function categoryFilterSize(f: CategoryFilter): number {
  return (f.uncategorized ? 1 : 0) + f.categories.length + f.subcategories.length;
}

/** The categories the filter lists, in the list's order: money out first, then the money-in ones. */
export function filterCategories(list: readonly CategoryDef[]): CategoryDef[] {
  const out = list.filter((c) => c.outOrder != null).sort((a, b) => (a.outOrder ?? 0) - (b.outOrder ?? 0));
  const rest = list.filter((c) => c.outOrder == null).sort((a, b) => (a.inOrder ?? 0) - (b.inOrder ?? 0));
  return [...out, ...rest];
}

const sortedSubs = (c: CategoryDef) => [...c.subs].sort((a, b) => a.sortOrder - b.sortOrder);

/** The count of a category and of each of its sub-categories, from GET category-counts. */
export function countsOf(counts: CategoryCounts | null | undefined, categoryKey: string) {
  const found = counts?.categories.find((c) => c.categoryKey === categoryKey);
  return {
    count: found?.count,
    sub: (subKey: string) => found?.subs.find((s) => s.subcategoryKey === subKey)?.count,
  };
}

export type RowState = boolean | 'indeterminate';

/** A category row: ticked when it is whole, half-ticked when only some of its sub-categories are. */
export function categoryRowState(f: CategoryFilter, category: CategoryDef): RowState {
  if (f.categories.includes(category.key)) return true;
  const subs = sortedSubs(category);
  const ticked = subs.filter((s) => f.subcategories.includes(s.key)).length;
  if (ticked === 0) return false;
  return ticked === subs.length ? true : 'indeterminate';
}

/** A sub-category row: ticked on its own, or because its category is whole. */
export function subRowState(f: CategoryFilter, category: CategoryDef, subKey: string): boolean {
  return f.categories.includes(category.key) || f.subcategories.includes(subKey);
}

/** Ticks or unticks Uncategorized. The server ANDs filters, so it replaces any category pick. */
export function toggleUncategorized(f: CategoryFilter): CategoryFilter {
  return f.uncategorized ? { ...f, uncategorized: false } : { uncategorized: true, categories: [], subcategories: [] };
}

/**
 * Ticks or unticks a whole category. Ticking one over narrowed sub-categories widens those to their whole categories
 * (the server ANDs the category and sub-category filters, so the two cannot be mixed).
 */
export function toggleCategory(f: CategoryFilter, category: CategoryDef, list: readonly CategoryDef[]): CategoryFilter {
  if (f.categories.includes(category.key)) {
    return { ...f, categories: f.categories.filter((k) => k !== category.key) };
  }
  const parents = list.filter((c) => c.subs.some((s) => f.subcategories.includes(s.key))).map((c) => c.key);
  return { uncategorized: false, categories: [...new Set([...f.categories, ...parents, category.key])], subcategories: [] };
}

/**
 * Ticks or unticks one sub-category. Unticking one of a whole category narrows it to the others; ticking one with other
 * whole categories ticked narrows to that category alone (the server ANDs the two filters).
 */
export function toggleSub(f: CategoryFilter, category: CategoryDef, subKey: string): CategoryFilter {
  const subs = sortedSubs(category).map((s) => s.key);
  if (f.categories.includes(category.key)) {
    return { uncategorized: false, categories: [], subcategories: subs.filter((k) => k !== subKey) };
  }
  const base = f.categories.length > 0 || f.uncategorized ? [] : f.subcategories;
  const next = base.includes(subKey) ? base.filter((k) => k !== subKey) : [...base, subKey];
  return { uncategorized: false, categories: [], subcategories: next };
}

/** The chip's words once something is ticked: "Category · Food" for one, "Category · 2" for more. */
export function categoryChipLabel(f: CategoryFilter, list: readonly CategoryDef[]): string {
  const size = categoryFilterSize(f);
  if (size === 0) return 'Category';
  if (size > 1) return `Category · ${size}`;
  if (f.uncategorized) return 'Category · Uncategorized';
  if (f.categories[0]) return `Category · ${list.find((c) => c.key === f.categories[0])?.name ?? '1'}`;
  const sub = list.flatMap((c) => c.subs.map((s) => ({ c, s }))).find(({ s }) => s.key === f.subcategories[0]);
  return `Category · ${sub ? sub.s.name : '1'}`;
}

/** The tag filter: no tag, or any of these tags. */
export interface TagFilter {
  untagged: boolean;
  tags: string[];
}

export function toggleUntagged(f: TagFilter): TagFilter {
  return f.untagged ? { ...f, untagged: false } : { untagged: true, tags: [] };
}

export function toggleTag(f: TagFilter, id: string): TagFilter {
  const tags = f.tags.includes(id) ? f.tags.filter((t) => t !== id) : [...f.tags, id];
  return { untagged: false, tags };
}

export function tagChipLabel(f: TagFilter, tags: readonly { id: string; name: string }[]): string {
  const size = (f.untagged ? 1 : 0) + f.tags.length;
  if (size === 0) return 'Tags';
  if (size > 1) return `Tags · ${size}`;
  if (f.untagged) return 'Tags · Untagged';
  return `Tags · ${tags.find((t) => t.id === f.tags[0])?.name ?? '1'}`;
}

/** What the Category dropdown lists: the categories with something in them (or ticked), narrowed by the search text. */
export function visibleCategories(
  list: readonly CategoryDef[],
  counts: CategoryCounts | null | undefined,
  f: CategoryFilter,
  search: string,
): { category: CategoryDef; subs: CategoryDef['subs']; expand: boolean }[] {
  const needle = search.trim().toLowerCase();
  const out: { category: CategoryDef; subs: CategoryDef['subs']; expand: boolean }[] = [];
  for (const category of filterCategories(list)) {
    const c = countsOf(counts, category.key);
    const ticked = categoryRowState(f, category) !== false;
    const hasAny = !counts || (c.count ?? 0) > 0 || ticked;
    if (!hasAny) continue;
    const subs = sortedSubs(category).filter((s) => !counts || (c.sub(s.key) ?? 0) > 0 || f.subcategories.includes(s.key));
    if (!needle) {
      out.push({ category, subs, expand: false });
      continue;
    }
    if (category.name.toLowerCase().includes(needle)) out.push({ category, subs, expand: false });
    else {
      const hits = subs.filter((s) => s.name.toLowerCase().includes(needle));
      if (hits.length > 0) out.push({ category, subs: hits, expand: true });
    }
  }
  return out;
}
