'use client';

import { useCallback, useMemo } from 'react';

import { Account } from '@/lib/account.types';
import { FilterClause, FilterValue } from '@/lib/reports.types';
import { AccountType } from '@/lib/types';

import {
  ACCOUNT_TYPE_OPTIONS,
  DATE_PRESETS,
  REVIEW_TYPE_OPTIONS,
  SOURCE_OPTIONS,
} from './constants';

interface UseTransactionFiltersProps {
  accounts: Account[];
  appliedFilters: FilterClause[];
  onFiltersChange: (filters: FilterClause[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function useTransactionFilters({
  accounts,
  appliedFilters,
  onFiltersChange,
  search,
  onSearchChange,
}: UseTransactionFiltersProps) {
  const getFilter = useCallback(
    (field: string) => appliedFilters.find((f) => f.field === field),
    [appliedFilters]
  );

  const activeType = useMemo(() => {
    const clause = getFilter('type');
    if (!clause || !clause.value) return 'ALL';
    return String(clause.value);
  }, [getFilter]);

  const activeDate = useMemo(() => {
    const clause = getFilter('date');
    if (!clause) return { operator: 'all_time', label: 'All Time' };
    if (clause.operator === 'between' && clause.value && typeof clause.value === 'object') {
      const v = clause.value as { from: string; to: string };
      return { operator: 'between', label: `${v.from} to ${v.to}`, from: v.from, to: v.to };
    }
    const preset = DATE_PRESETS.find((p) => p.value === clause.operator);
    return { operator: clause.operator, label: preset?.label ?? clause.operator };
  }, [getFilter]);

  const activeAccountIds = useMemo(() => {
    const clause = getFilter('accountId');
    if (!clause || !clause.value) return [];
    if (Array.isArray(clause.value)) return clause.value as string[];
    return [String(clause.value)];
  }, [getFilter]);

  const selectableAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => a.type !== AccountType.BROKER || activeAccountIds.includes(a.id)
      ),
    [accounts, activeAccountIds]
  );

  const activeCategories = useMemo(() => {
    const clause = getFilter('category');
    if (!clause || !clause.value) return [];
    if (Array.isArray(clause.value)) return clause.value as string[];
    return [String(clause.value)];
  }, [getFilter]);

  const isMonitoringActive = useMemo(() => {
    const clause = getFilter('isUnderMonitoring');
    return clause?.value === true;
  }, [getFilter]);

  const setFilterClause = useCallback(
    (field: string, operator: string | null, value?: FilterValue) => {
      if (!operator) {
        onFiltersChange(appliedFilters.filter((f) => f.field !== field));
        return;
      }
      const existingIdx = appliedFilters.findIndex((f) => f.field === field);
      const newClause: FilterClause = { field, operator, value };
      if (existingIdx >= 0) {
        const next = [...appliedFilters];
        next[existingIdx] = newClause;
        onFiltersChange(next);
      } else {
        onFiltersChange([...appliedFilters, newClause]);
      }
    },
    [appliedFilters, onFiltersChange]
  );

  const removeFilter = useCallback(
    (field: string) => {
      onFiltersChange(appliedFilters.filter((f) => f.field !== field));
    },
    [appliedFilters, onFiltersChange]
  );

  const handleTypeChange = (type: 'ALL' | 'DEBIT' | 'CREDIT') => {
    if (type === 'ALL') {
      removeFilter('type');
    } else {
      setFilterClause('type', 'is', type);
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoringActive) {
      removeFilter('isUnderMonitoring');
    } else {
      setFilterClause('isUnderMonitoring', 'is', true);
    }
  };

  const handleDateSelect = (op: string) => {
    if (op === 'all_time') {
      removeFilter('date');
    } else if (op !== 'custom') {
      setFilterClause('date', op);
    }
  };

  const handleApplyCustomDate = (from: string, to: string) => {
    setFilterClause('date', 'between', { from, to });
  };

  const handleAccountToggle = (id: string) => {
    let next: string[];
    if (activeAccountIds.includes(id)) {
      next = activeAccountIds.filter((item) => item !== id);
    } else {
      next = [...activeAccountIds, id];
    }
    if (next.length === 0) {
      removeFilter('accountId');
    } else if (next.length === 1) {
      setFilterClause('accountId', 'is', next[0]);
    } else {
      setFilterClause('accountId', 'in', next);
    }
  };

  const handleCategoryToggle = (name: string) => {
    let next: string[];
    if (activeCategories.includes(name)) {
      next = activeCategories.filter((item) => item !== name);
    } else {
      next = [...activeCategories, name];
    }
    if (next.length === 0) {
      removeFilter('category');
    } else if (next.length === 1) {
      setFilterClause('category', 'is', next[0]);
    } else {
      setFilterClause('category', 'in', next);
    }
  };

  const handleApplyAmount = (
    op: 'greater_than' | 'less_than' | 'between',
    val1: string,
    val2: string
  ) => {
    const num1 = parseFloat(val1);
    if (isNaN(num1)) return;

    if (op === 'between') {
      const num2 = parseFloat(val2);
      if (isNaN(num2)) return;
      setFilterClause('amount', 'between', {
        from: Math.min(num1, num2),
        to: Math.max(num1, num2),
      });
    } else {
      setFilterClause('amount', op, num1);
    }
  };

  const handleClearAll = () => {
    onFiltersChange([]);
    onSearchChange('');
  };

  const activeBadges = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];

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
  }, [appliedFilters, accounts, removeFilter]);

  return {
    activeType,
    activeDate,
    activeAccountIds,
    selectableAccounts,
    activeCategories,
    isMonitoringActive,
    hasAmountFilter: Boolean(getFilter('amount')),
    activeBadges,
    setFilterClause,
    handleTypeChange,
    toggleMonitoring,
    handleDateSelect,
    handleApplyCustomDate,
    handleAccountToggle,
    handleCategoryToggle,
    handleApplyAmount,
    handleClearAll,
  };
}
