// The Add-widget picker's categories and its search, as pure helpers. A
// built-in belongs to the category the server gives it; one whose category the
// picker does not know still shows under All. "Your reports" holds the user's
// saved reports.

import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';

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

export { filterBuiltins, filterReports, matchesQuery } from '@/features/dashboards/picker/pickerModel';
