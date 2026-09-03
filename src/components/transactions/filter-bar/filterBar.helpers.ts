import { Account } from '@/lib/account.types';
import { FilterClause } from '@/lib/reports.types';

import {
  ACCOUNT_TYPE_OPTIONS,
  DATE_PRESETS,
  REVIEW_TYPE_OPTIONS,
  SOURCE_OPTIONS,
} from './constants';

export function findFilterClause(
  filters: FilterClause[],
  field: string
): FilterClause | undefined {
  return filters.find((f) => f.field === field);
}

export function getActiveType(filters: FilterClause[]): string {
  const clause = findFilterClause(filters, 'type');
  if (!clause || !clause.value) return 'ALL';
  return String(clause.value);
}

export function getActiveDate(filters: FilterClause[]) {
  const clause = findFilterClause(filters, 'date');
  if (!clause) return { operator: 'all_time', label: 'All Time' };
  if (clause.operator === 'between' && clause.value && typeof clause.value === 'object') {
    const v = clause.value as { from: string; to: string };
    return { operator: 'between', label: `${v.from} to ${v.to}`, from: v.from, to: v.to };
  }
  const preset = DATE_PRESETS.find((p) => p.value === clause.operator);
  return { operator: clause.operator, label: preset?.label ?? clause.operator };
}

/** Reads a filter clause's value as a string array, whether it holds a single
 * value or an array (used by both the `accountId` and `category` clauses). */
export function getActiveIds(filters: FilterClause[], field: string): string[] {
  const clause = findFilterClause(filters, field);
  if (!clause || !clause.value) return [];
  if (Array.isArray(clause.value)) return clause.value as string[];
  return [String(clause.value)];
}

export function getIsMonitoringActive(filters: FilterClause[]): boolean {
  const clause = findFilterClause(filters, 'isUnderMonitoring');
  return clause?.value === true;
}

export interface ActiveBadge {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Renders every applied filter clause as a removable toolbar badge. */
export function buildActiveBadges(
  appliedFilters: FilterClause[],
  accounts: Account[],
  removeFilter: (field: string) => void
): ActiveBadge[] {
  const list: ActiveBadge[] = [];

  appliedFilters.forEach((f) => {
    if (f.field === 'type') {
      const val =
        f.value === 'DEBIT'
          ? 'Expense'
          : f.value === 'CREDIT'
          ? 'Income'
          : String(f.value);
      list.push({
        key: 'type',
        label: `Type: ${val}`,
        onRemove: () => removeFilter('type'),
      });
    } else if (f.field === 'date') {
      const preset = DATE_PRESETS.find((p) => p.value === f.operator);
      const label = preset
        ? preset.label
        : f.operator === 'between' && f.value
        ? `${(f.value as { from: string; to: string }).from} - ${(f.value as { from: string; to: string }).to}`
        : f.operator;
      list.push({
        key: 'date',
        label: `Date: ${label}`,
        onRemove: () => removeFilter('date'),
      });
    } else if (f.field === 'accountId') {
      const ids = Array.isArray(f.value) ? (f.value as string[]) : [String(f.value)];
      const names = ids
        .map((id) => accounts.find((a) => a.id === id)?.name || id)
        .join(', ');
      list.push({
        key: 'accountId',
        label: `Account: ${names}`,
        onRemove: () => removeFilter('accountId'),
      });
    } else if (f.field === 'category') {
      const cats = Array.isArray(f.value) ? (f.value as string[]) : [String(f.value)];
      list.push({
        key: 'category',
        label: `Category: ${cats.join(', ')}`,
        onRemove: () => removeFilter('category'),
      });
    } else if (f.field === 'amount') {
      let label = `Amount ${f.operator} ${f.value}`;
      if (f.operator === 'greater_than') label = `Amount > ₹${f.value}`;
      else if (f.operator === 'less_than') label = `Amount < ₹${f.value}`;
      else if (f.operator === 'between' && f.value)
        label = `Amount: ₹${(f.value as { from: number; to: number }).from} - ₹${(f.value as { from: number; to: number }).to}`;
      list.push({
        key: 'amount',
        label,
        onRemove: () => removeFilter('amount'),
      });
    } else if (f.field === 'reviewType') {
      const opt = REVIEW_TYPE_OPTIONS.find((r) => r.value === f.value);
      list.push({
        key: 'reviewType',
        label: `Review: ${opt?.label || f.value}`,
        onRemove: () => removeFilter('reviewType'),
      });
    } else if (f.field === 'source') {
      const opt = SOURCE_OPTIONS.find((s) => s.value === f.value);
      list.push({
        key: 'source',
        label: `Source: ${opt?.label || f.value}`,
        onRemove: () => removeFilter('source'),
      });
    } else if (f.field === 'accountType') {
      const opt = ACCOUNT_TYPE_OPTIONS.find((s) => s.value === f.value);
      list.push({
        key: 'accountType',
        label: `Acc Type: ${opt?.label || f.value}`,
        onRemove: () => removeFilter('accountType'),
      });
    } else if (f.field === 'isExcluded') {
      list.push({
        key: 'isExcluded',
        label: `Excluded: ${f.value ? 'Yes' : 'No'}`,
        onRemove: () => removeFilter('isExcluded'),
      });
    } else if (f.field === 'isUnderMonitoring') {
      list.push({
        key: 'isUnderMonitoring',
        label: `Under Monitoring`,
        onRemove: () => removeFilter('isUnderMonitoring'),
      });
    }
  });

  return list;
}
