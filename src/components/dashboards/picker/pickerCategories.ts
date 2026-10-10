// The Add-widget picker's categories and its search, as pure helpers. A
// built-in belongs to the category the server gives it; one whose category the
// picker does not know still shows under All. "Your reports" holds the user's
// saved reports.

import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

export type PickerCategory =
  | 'all'
  | 'overview'
  | 'cards_rewards'
  | 'spending'
  | 'investments'
  | 'loans_lending'
  | 'shortcuts'
  | 'reports';

export const PICKER_CATEGORIES: ReadonlyArray<{ id: PickerCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'overview', label: 'Overview' },
  { id: 'cards_rewards', label: 'Cards & rewards' },
  { id: 'spending', label: 'Spending' },
  { id: 'investments', label: 'Investments' },
  { id: 'loans_lending', label: 'Loans & lending' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'reports', label: 'Your reports' },
];

/** The categories to offer: All and Your reports always, a built-in category only when it has entries. */
export function visibleCategories(builtins: BuiltinWidgetResponse[]): typeof PICKER_CATEGORIES {
  const used = new Set(builtins.map((b) => b.category));
  return PICKER_CATEGORIES.filter((c) => c.id === 'all' || c.id === 'reports' || used.has(c.id));
}

/** Case-insensitive match of every word of the query against any of the texts. */
export function matchesQuery(query: string, ...texts: Array<string | null | undefined>): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}

/** The built-ins shown for a category and query (none under Your reports). */
export function filterBuiltins(
  builtins: BuiltinWidgetResponse[],
  category: PickerCategory,
  query: string,
): BuiltinWidgetResponse[] {
  if (category === 'reports') return [];
  return builtins.filter(
    (b) => (category === 'all' || b.category === category) && matchesQuery(query, b.label, b.description),
  );
}

/** The saved reports shown for a category and query (only under All and Your reports). */
export function filterReports(
  reports: ReportSummaryResponse[],
  category: PickerCategory,
  query: string,
): ReportSummaryResponse[] {
  if (category !== 'all' && category !== 'reports') return [];
  return reports.filter((r) => matchesQuery(query, r.name, r.type));
}
