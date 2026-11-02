import type { CategoryDef } from '@/lib/categoryList.types';
import { formatCount } from '@/lib/format';

/**
 * What the Category filter holds. The server ORs within it: Uncategorized, or any ticked category, or any narrowed
 * sub-category. A category in `categories` with none of its sub-categories in `subcategories` is whole; with some, it is narrowed to those.
 */
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

/** The categories the filter lists, in the list's order: money out first, then the money-in ones. */
export function filterCategories(list: readonly CategoryDef[]): CategoryDef[] {
  const out = list.filter((c) => c.outOrder != null).sort((a, b) => (a.outOrder ?? 0) - (b.outOrder ?? 0));
  const rest = list.filter((c) => c.outOrder == null).sort((a, b) => (a.inOrder ?? 0) - (b.inOrder ?? 0));
  return [...out, ...rest];
}

const sortedSubs = (c: CategoryDef) => [...c.subs].sort((a, b) => a.sortOrder - b.sortOrder);
const subKeysOf = (c: CategoryDef) => sortedSubs(c).map((s) => s.key);

/** The sub-categories of `category` the filter narrows it to (empty: the whole category, or not ticked at all). */
function narrowedTo(f: CategoryFilter, category: CategoryDef): string[] {
  const keys = subKeysOf(category);
  return f.subcategories.filter((k) => keys.includes(k));
}

export type RowState = boolean | 'indeterminate';

/** A category row: ticked when whole, half-ticked when narrowed to some of its sub-categories. */
export function categoryRowState(f: CategoryFilter, category: CategoryDef): RowState {
  const narrowed = narrowedTo(f, category);
  if (narrowed.length > 0) return narrowed.length === category.subs.length ? true : 'indeterminate';
  return f.categories.includes(category.key);
}

/** A sub-category row: ticked on its own, or because its category is ticked whole. */
export function subRowState(f: CategoryFilter, category: CategoryDef, subKey: string): boolean {
  const narrowed = narrowedTo(f, category);
  return narrowed.length > 0 ? narrowed.includes(subKey) : f.categories.includes(category.key);
}

/** The line under a ticked category's name: "All 5 sub-categories", or "2 of 5 sub-categories" when narrowed; none otherwise. */
export function categorySubtitle(f: CategoryFilter, category: CategoryDef): string | undefined {
  const n = category.subs.length;
  const state = categoryRowState(f, category);
  if (n === 0 || state === false) return undefined;
  const narrowed = narrowedTo(f, category).length;
  if (narrowed > 0 && narrowed < n) return `${narrowed} of ${formatCount(n, ['sub-category', 'sub-categories'])}`;
  return `All ${formatCount(n, ['sub-category', 'sub-categories'])}`;
}

/** Ticks or unticks Uncategorized; it sits beside the category picks. */
export function toggleUncategorized(f: CategoryFilter): CategoryFilter {
  return { ...f, uncategorized: !f.uncategorized };
}

/** Ticks a category whole, or unticks it with any narrowing of it. */
export function toggleCategory(f: CategoryFilter, category: CategoryDef): CategoryFilter {
  const keys = subKeysOf(category);
  const subcategories = f.subcategories.filter((k) => !keys.includes(k));
  if (categoryRowState(f, category) !== false) {
    return { ...f, categories: f.categories.filter((k) => k !== category.key), subcategories };
  }
  return { ...f, categories: [...f.categories, category.key], subcategories };
}

/**
 * Ticks or unticks one sub-category. A sub-category narrows its category: unticking one of a whole category leaves the
 * others, ticking one of an unticked category ticks the category narrowed to it, all of them make it whole again, and
 * unticking the last one unticks the category.
 */
export function toggleSub(f: CategoryFilter, category: CategoryDef, subKey: string): CategoryFilter {
  const keys = subKeysOf(category);
  const now = categoryRowState(f, category) === false ? [] : narrowedTo(f, category).length > 0 ? narrowedTo(f, category) : f.categories.includes(category.key) ? keys : [];
  const next = now.includes(subKey) ? now.filter((k) => k !== subKey) : [...now, subKey];
  const rest = f.subcategories.filter((k) => !keys.includes(k));
  const others = f.categories.filter((k) => k !== category.key);
  if (next.length === 0) return { ...f, categories: others, subcategories: rest };
  if (next.length === keys.length) return { ...f, categories: [...others, category.key], subcategories: rest };
  return { ...f, categories: [...others, category.key], subcategories: [...rest, ...keys.filter((k) => next.includes(k))] };
}

/** How many things are ticked: Uncategorized and each ticked category (a narrowing is part of its category). */
export function categoryFilterSize(f: CategoryFilter, list: readonly CategoryDef[]): number {
  const standalone = list.filter((c) => !f.categories.includes(c.key) && narrowedTo(f, c).length > 0).length;
  return (f.uncategorized ? 1 : 0) + f.categories.length + standalone;
}

/** The chip's words once something is ticked: "Category · Food" for one, "Category · 2" for more. */
export function categoryChipLabel(f: CategoryFilter, list: readonly CategoryDef[]): string {
  const size = categoryFilterSize(f, list);
  if (size === 0) return 'Category';
  if (size > 1) return `Category · ${size}`;
  if (f.uncategorized) return 'Category · Uncategorized';
  const category = list.find((c) => f.categories.includes(c.key) || narrowedTo(f, c).length > 0);
  if (!category) return 'Category · 1';
  const narrowed = narrowedTo(f, category);
  const sub = narrowed.length === 1 ? category.subs.find((s) => s.key === narrowed[0]) : undefined;
  return `Category · ${sub ? sub.name : category.name}`;
}

/** The tag filter: no tag, or any of these tags (the server ORs them). */
export interface TagFilter {
  untagged: boolean;
  tags: string[];
}

export function toggleUntagged(f: TagFilter): TagFilter {
  return { ...f, untagged: !f.untagged };
}

export function toggleTag(f: TagFilter, id: string): TagFilter {
  return { ...f, tags: f.tags.includes(id) ? f.tags.filter((t) => t !== id) : [...f.tags, id] };
}

export function tagChipLabel(f: TagFilter, tags: readonly { id: string; name: string }[]): string {
  const size = (f.untagged ? 1 : 0) + f.tags.length;
  if (size === 0) return 'Tags';
  if (size > 1) return `Tags · ${size}`;
  if (f.untagged) return 'Tags · Untagged';
  return `Tags · ${tags.find((t) => t.id === f.tags[0])?.name ?? '1'}`;
}

/** What the Category dropdown lists: every category, narrowed by the search text (a sub-category hit opens its category). */
export function visibleCategories(
  list: readonly CategoryDef[],
  search: string,
): { category: CategoryDef; subs: CategoryDef['subs']; expand: boolean }[] {
  const needle = search.trim().toLowerCase();
  const out: { category: CategoryDef; subs: CategoryDef['subs']; expand: boolean }[] = [];
  for (const category of filterCategories(list)) {
    const subs = sortedSubs(category);
    if (!needle || category.name.toLowerCase().includes(needle)) {
      out.push({ category, subs, expand: false });
      continue;
    }
    const hits = subs.filter((s) => s.name.toLowerCase().includes(needle));
    if (hits.length > 0) out.push({ category, subs: hits, expand: true });
  }
  return out;
}

/** The Category field's value for the uncategorized pick; category and sub-category keys are the rest. */
export const UNCATEGORIZED_VALUE = '__uncategorized';
export const UNTAGGED_VALUE = '__untagged';

/** The filter as the Category field's flat list: Uncategorized, a whole category by its key, a narrowed one by its sub-category keys. */
export function categoryFieldValue(f: CategoryFilter, list: readonly CategoryDef[]): string[] {
  const out: string[] = f.uncategorized ? [UNCATEGORIZED_VALUE] : [];
  for (const category of filterCategories(list)) {
    const narrowed = narrowedTo(f, category);
    if (narrowed.length > 0 && narrowed.length < category.subs.length) out.push(...subKeysOf(category).filter((k) => narrowed.includes(k)));
    else if (narrowed.length > 0 || f.categories.includes(category.key)) out.push(category.key);
  }
  return out;
}

/** The inverse of `categoryFieldValue`: a picked category key is whole, picked sub-category keys narrow their category. */
export function categoryFilterFromField(value: readonly string[], list: readonly CategoryDef[]): CategoryFilter {
  const categories: string[] = [];
  const subcategories: string[] = [];
  for (const category of filterCategories(list)) {
    if (value.includes(category.key)) {
      categories.push(category.key);
      continue;
    }
    const hits = subKeysOf(category).filter((k) => value.includes(k));
    if (hits.length > 0) {
      categories.push(category.key);
      subcategories.push(...hits);
    }
  }
  return { uncategorized: value.includes(UNCATEGORIZED_VALUE), categories, subcategories };
}

export function tagFieldValue(f: TagFilter): string[] {
  return [...(f.untagged ? [UNTAGGED_VALUE] : []), ...f.tags];
}

export function tagFilterFromField(value: readonly string[]): TagFilter {
  return { untagged: value.includes(UNTAGGED_VALUE), tags: value.filter((v) => v !== UNTAGGED_VALUE) };
}
