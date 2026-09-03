'use client';

import { useCallback, useMemo } from 'react';

import { Account } from '@/lib/account.types';
import { FilterClause, FilterValue } from '@/lib/reports.types';
import { AccountType } from '@/lib/types';

import {
  buildActiveBadges,
  findFilterClause,
  getActiveDate,
  getActiveIds,
  getActiveType,
  getIsMonitoringActive,
} from './filterBar.helpers';

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
    (field: string) => findFilterClause(appliedFilters, field),
    [appliedFilters]
  );

  const activeType = useMemo(() => getActiveType(appliedFilters), [appliedFilters]);

  const activeDate = useMemo(() => getActiveDate(appliedFilters), [appliedFilters]);

  const activeAccountIds = useMemo(
    () => getActiveIds(appliedFilters, 'accountId'),
    [appliedFilters]
  );

  const selectableAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => a.type !== AccountType.BROKER || activeAccountIds.includes(a.id)
      ),
    [accounts, activeAccountIds]
  );

  const activeCategories = useMemo(
    () => getActiveIds(appliedFilters, 'category'),
    [appliedFilters]
  );

  const isMonitoringActive = useMemo(
    () => getIsMonitoringActive(appliedFilters),
    [appliedFilters]
  );

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

  const activeBadges = useMemo(
    () => buildActiveBadges(appliedFilters, accounts, removeFilter),
    [appliedFilters, accounts, removeFilter]
  );

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
