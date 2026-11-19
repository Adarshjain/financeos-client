// "Open in Transactions": the Transactions page query that lists the same rows as a report's drill-down.
// It takes the clauses of the drill-down request (the report's filters plus the pinned bucket) and returns
// null unless every one of them can be said exactly in the Transactions filter, so the link never shows a
// different list than the dialog.

import {
  DEFAULT_QUERY,
  type Period,
  PERIOD_PRESETS,
  type PeriodPresetId,
  type TransactionsQuery,
  type TypeFilter,
  validDate,
} from '@/features/transactions/list/transactionsUrl';
import { categoryLabel } from '@/lib/categoryList';
import type { CategoryDef } from '@/lib/categoryList.types';
import { todayInAppZone } from '@/lib/date-range';
import type { FilterClause } from '@/lib/reports.types';

/**
 * The flag clauses that only hide left-out rows. The link leaves them out (Transactions cannot say them) and they do
 * not block it; any other form of these fields (e.g. `countsInTotals is false`) cannot be said and blocks it.
 */
const HIDE_FLAGS: Record<string, boolean> = { countsInTotals: true, isExcluded: false, isTransferLeg: false };
const isFlag = (f: FilterClause): boolean => f.field in HIDE_FLAGS;
const hidesLeftOut = (f: FilterClause): boolean => f.operator === 'is' && f.value === HIDE_FLAGS[f.field];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNCATEGORIZED = 'Uncategorized';

const PRESET_IDS: readonly string[] = PERIOD_PRESETS.map((p) => p.id);

// ---- Dates (calendar arithmetic on ISO days; no clock is read) ---------------

const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
};

const iso = (y: number, m: number, d: number): string => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

function addDays(day: string, n: number): string {
  const [y, m, d] = parts(day);
  return iso(y, m, d + n);
}

/** Same day-of-month n months away, clamped to the month's end. */
function addMonths(day: string, n: number): string {
  const [y, m, d] = parts(day);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return iso(y, m + n, Math.min(d, last));
}

const range = (from: string, to: string): Period => ({ kind: 'range', from, to });

const amountOf = (value: FilterClause['value']): number | null => {
  const amount = value && typeof value === 'object' && 'amount' in value ? value.amount : null;
  return typeof amount === 'number' && Number.isInteger(amount) && amount > 0 ? amount : null;
};

/** The Transactions period of a report date clause; null when it has no exact equivalent. */
function periodOf(clause: FilterClause, today: string): Period | null {
  const { operator, value } = clause;
  if (operator === 'is') return typeof value === 'string' && validDate(value) ? { kind: 'date', date: value } : null;
  if (operator === 'between') {
    const r = value && typeof value === 'object' && 'from' in value ? value : null;
    if (!r || typeof r.from !== 'string' || typeof r.to !== 'string') return null;
    return validDate(r.from) && validDate(r.to) && r.from <= r.to ? range(r.from, r.to) : null;
  }
  if (PRESET_IDS.includes(operator)) return { kind: 'preset', id: operator as PeriodPresetId };
  const n = amountOf(value);
  switch (operator) {
    case 'last_x_days':
      if (n === null) return null;
      return n === 14 ? { kind: 'preset', id: 'last_14_days' } : range(addDays(today, -(n - 1)), today);
    case 'next_x_days':
      return n === null ? null : range(today, addDays(today, n - 1));
    case 'last_x_months':
      return n === null ? null : range(addDays(addMonths(today, -n), 1), today);
    case 'last_x_years':
      return n === null ? null : range(addDays(addMonths(today, -12 * n), 1), today);
    case 'previous_year': {
      const year = parts(today)[0] - 1;
      return range(iso(year, 1, 1), iso(year, 12, 31));
    }
    default:
      return null;
  }
}

// ---- Values ------------------------------------------------------------------

/** The values of an `is` or `in` clause as strings; null for any other operator or shape. */
function valuesOf(clause: FilterClause): string[] | null {
  if (clause.operator === 'is') return typeof clause.value === 'string' ? [clause.value] : null;
  if (clause.operator === 'in') {
    return Array.isArray(clause.value) && clause.value.every((v): v is string => typeof v === 'string') && clause.value.length > 0 ? clause.value : null;
  }
  return null;
}

const unique = <T,>(list: T[]): T[] => [...new Set(list)];

/** A category key, from the key itself or the category's name. */
function categoryKeyOf(list: readonly CategoryDef[], value: string): string | null {
  return (list.find((c) => c.key === value) ?? list.find((c) => c.name === value))?.key ?? null;
}

/** A sub-category key and its category's key, from the sub-category's key or its "Category · Sub" label. */
function subOf(list: readonly CategoryDef[], value: string): { key: string; categoryKey: string } | null {
  for (const c of list) {
    const sub = c.subs.find((s) => s.key === value || categoryLabel(c.name, s.name) === value);
    if (sub) return { key: sub.key, categoryKey: c.key };
  }
  return null;
}

interface CategoryPick {
  uncategorized: boolean;
  keys: string[];
}

function categoryPick(clause: FilterClause, list: readonly CategoryDef[]): CategoryPick | null {
  const values = valuesOf(clause);
  if (!values) return null;
  const keys: string[] = [];
  let uncategorized = false;
  for (const v of values) {
    if (v === UNCATEGORIZED) uncategorized = true;
    else {
      const key = categoryKeyOf(list, v);
      if (key === null) return null;
      keys.push(key);
    }
  }
  return { uncategorized, keys: unique(keys) };
}

function subcategoryPick(clause: FilterClause, list: readonly CategoryDef[]): (CategoryPick & { parents: string[] }) | null {
  const values = valuesOf(clause);
  if (!values) return null;
  const keys: string[] = [];
  const parents: string[] = [];
  let uncategorized = false;
  for (const v of values) {
    if (v === UNCATEGORIZED) uncategorized = true;
    else {
      const sub = subOf(list, v);
      // "Category · Others" (categorised, no sub-category) matches no sub-category and cannot be said in Transactions.
      if (sub === null) return null;
      keys.push(sub.key);
      parents.push(sub.categoryKey);
    }
  }
  return { uncategorized, keys: unique(keys), parents: unique(parents) };
}

function typeOf(clause: FilterClause): TypeFilter | null {
  const values = valuesOf(clause);
  if (!values || values.some((v) => v !== 'DEBIT' && v !== 'CREDIT')) return null;
  const set = unique(values);
  return set.length === 2 ? 'all' : set[0] === 'DEBIT' ? 'debit' : 'credit';
}

// ---- The query ---------------------------------------------------------------

/**
 * The Transactions query for the clauses of a drill-down, or null when one of them cannot be expressed exactly:
 * a negated operator, a tag or any field the Transactions filter has no equivalent for, two clauses on one field,
 * or a "Category · Others" pin. `countsInTotals is true`, `isExcluded is false` and `isTransferLeg is false` are left out; any other form of them returns null.
 * `categories` is the fixed category list (names and keys are resolved against it); `today` is the app-zone day.
 */
export function transactionsQueryFor(
  filters: readonly FilterClause[],
  categories: readonly CategoryDef[],
  today: string = todayInAppZone(),
): TransactionsQuery | null {
  if (filters.some((f) => isFlag(f) && !hidesLeftOut(f))) return null;
  const kept = filters.filter((f) => !isFlag(f));
  const of = (field: string) => kept.filter((f) => f.field === field);
  if (kept.some((f) => !['date', 'account', 'type', 'category', 'subcategory'].includes(f.field))) return null;
  if (['date', 'account', 'type', 'category', 'subcategory'].some((field) => of(field).length > 1)) return null;

  const query: TransactionsQuery = { ...DEFAULT_QUERY };

  const [date] = of('date');
  if (date) {
    const period = periodOf(date, today);
    if (!period) return null;
    query.period = period;
  }

  const [account] = of('account');
  if (account) {
    const ids = valuesOf(account);
    // A report's account clause can also hold account names, which Transactions does not take.
    if (!ids || ids.some((id) => !UUID.test(id))) return null;
    query.accounts = unique(ids);
  }

  const [type] = of('type');
  if (type) {
    const t = typeOf(type);
    if (t === null) return null;
    query.type = t;
  }

  const [category] = of('category');
  const [subcategory] = of('subcategory');
  const cat = category ? categoryPick(category, categories) : null;
  const sub = subcategory ? subcategoryPick(subcategory, categories) : null;
  if ((category && !cat) || (subcategory && !sub)) return null;

  if (cat && sub) {
    // Transactions widens these (a category is whole unless one of its sub-categories narrows it), so they only
    // stand for the report's "both" when no Uncategorized is involved and every category is narrowed by a sub-category.
    if (cat.uncategorized || sub.uncategorized) return null;
    if (cat.keys.length !== sub.parents.length || !cat.keys.every((k) => sub.parents.includes(k))) return null;
  }
  if (cat) {
    query.categories = cat.keys;
    query.uncategorized = cat.uncategorized;
  }
  if (sub) {
    query.subcategories = sub.keys;
    query.uncategorized = query.uncategorized || sub.uncategorized;
  }
  return query;
}
