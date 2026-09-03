'use client';

import { Eye, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { FilterClause } from '@/lib/reports.types';

import { AccountMultiSelect } from './filter-bar/AccountMultiSelect';
import { ActiveFiltersBadgeBar } from './filter-bar/ActiveFiltersBadgeBar';
import { AmountRangeFilter } from './filter-bar/AmountRangeFilter';
import { CategoryMultiSelect } from './filter-bar/CategoryMultiSelect';
import { DatePresetsPopover } from './filter-bar/DatePresetsPopover';
import { MoreFiltersDropdown } from './filter-bar/MoreFiltersDropdown';
import { TypeSegmentControl } from './filter-bar/TypeSegmentControl';
import { useTransactionFilters } from './filter-bar/useTransactionFilters';

interface TransactionFilterBarProps {
  appliedFilters: FilterClause[];
  onFiltersChange: (filters: FilterClause[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function TransactionFilterBar({
  appliedFilters,
  onFiltersChange,
  search,
  onSearchChange,
}: TransactionFilterBarProps) {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const {
    activeType,
    activeDate,
    activeAccountIds,
    selectableAccounts,
    activeCategories,
    isMonitoringActive,
    hasAmountFilter,
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
  } = useTransactionFilters({
    accounts,
    appliedFilters,
    onFiltersChange,
    search,
    onSearchChange,
  });

  return (
    <div className="space-y-1 pt-0.5">
      {/* Top Row: Mobile-first Search Bar */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <Input
          placeholder="Search descriptions, accounts, categories..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 h-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus-visible:ring-emerald-500 focus-visible:border-transparent shadow-xs transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Quick Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 pt-1.5">
        {/* Type Segment Control Pill */}
        <TypeSegmentControl activeType={activeType} onTypeChange={handleTypeChange} />

        {/* Date Presets Popover Pill */}
        <DatePresetsPopover
          activeDate={activeDate}
          onDateSelect={handleDateSelect}
          onApplyCustomDate={handleApplyCustomDate}
        />

        {/* Account Multi-Select Popover Pill */}
        <AccountMultiSelect
          accounts={accounts}
          selectableAccounts={selectableAccounts}
          activeAccountIds={activeAccountIds}
          onAccountToggle={handleAccountToggle}
        />

        {/* Category Multi-Select Popover Pill */}
        <CategoryMultiSelect
          categories={categories}
          activeCategories={activeCategories}
          onCategoryToggle={handleCategoryToggle}
        />

        {/* Surfaced Under Monitoring Quick Filter Pill */}
        <Button
          variant={isMonitoringActive ? 'filter-active' : 'filter'}
          size="pill"
          onClick={toggleMonitoring}
        >
          <Eye className="h-3 w-3 opacity-70" />
          <span>Monitoring</span>
        </Button>

        {/* Amount Range Filter Pill */}
        <AmountRangeFilter
          hasAmountFilter={hasAmountFilter}
          onApplyAmount={handleApplyAmount}
        />

        {/* More Filters Dropdown (+ Filter) */}
        <MoreFiltersDropdown onSetFilter={setFilterClause} />
      </div>

      {/* Active Filters Badge Bar */}
      <ActiveFiltersBadgeBar
        search={search}
        onSearchChange={onSearchChange}
        activeBadges={activeBadges}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
