'use client';

import {
  Calendar as CalendarIcon,
  ChevronDown,
  Eye,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { FilterClause } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

interface TransactionFilterBarProps {
  accounts: Account[];
  categories: Category[];
  appliedFilters: FilterClause[];
  onFiltersChange: (filters: FilterClause[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const DATE_PRESETS = [
  { label: 'All Time', value: 'all_time' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'previous_month' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'previous_week' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Current FY', value: 'current_fy' },
  { label: 'Prev FY', value: 'prev_fy' },
];

const SOURCE_OPTIONS = [
  { label: 'Gmail Alert', value: 'gmail_transaction_alert' },
  { label: 'Gmail Statement', value: 'gmail_statement' },
  { label: 'Manual', value: 'manual' },
  { label: 'File Upload', value: 'file_upload' },
];

const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Bank Account', value: 'bank_account' },
  { label: 'Credit Card', value: 'credit_card' },
  { label: 'Stock', value: 'stock' },
  { label: 'Mutual Fund', value: 'mutual_fund' },
  { label: 'Generic', value: 'generic' },
];

const REVIEW_TYPE_OPTIONS = [
  { label: 'Needs Review', value: 'NEEDS_REVIEW' },
  { label: 'Auto Reviewed', value: 'AUTO_REVIEWED' },
  { label: 'Manually Reviewed', value: 'MANUALLY_REVIEWED' },
  { label: 'N/A', value: 'NA' },
];

export function TransactionFilterBar({
                                       accounts,
                                       categories,
                                       appliedFilters,
                                       onFiltersChange,
                                       search,
                                       onSearchChange,
                                     }: TransactionFilterBarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);

  // Custom date state
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Amount state
  const [amountOp, setAmountOp] = useState<'greater_than' | 'less_than' | 'between'>('greater_than');
  const [amountVal1, setAmountVal1] = useState('');
  const [amountVal2, setAmountVal2] = useState('');

  // Helper to extract current active values for a field
  const getFilter = useCallback(
    (field: string) => appliedFilters.find((f) => f.field === field),
    [appliedFilters],
  );

  // Active Transaction Type ('ALL' | 'DEBIT' | 'CREDIT')
  const activeType = useMemo(() => {
    const clause = getFilter('type');
    if (!clause || !clause.value) return 'ALL';
    return String(clause.value);
  }, [getFilter]);

  // Active Date preset or custom
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

  // Active Account IDs
  const activeAccountIds = useMemo(() => {
    const clause = getFilter('accountId');
    if (!clause || !clause.value) return [];
    if (Array.isArray(clause.value)) return clause.value as string[];
    return [String(clause.value)];
  }, [getFilter]);

  // Active Category Names
  const activeCategories = useMemo(() => {
    const clause = getFilter('category');
    if (!clause || !clause.value) return [];
    if (Array.isArray(clause.value)) return clause.value as string[];
    return [String(clause.value)];
  }, [getFilter]);

  // Surfaced Monitoring State
  const isMonitoringActive = useMemo(() => {
    const clause = getFilter('isUnderMonitoring');
    return clause?.value === true;
  }, [getFilter]);

  // Update or set a filter clause
  const setFilterClause = useCallback(
    (field: string, operator: string | null, value?: any) => {
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
    [appliedFilters, onFiltersChange],
  );

  const removeFilter = useCallback(
    (field: string) => {
      onFiltersChange(appliedFilters.filter((f) => f.field !== field));
    },
    [appliedFilters, onFiltersChange],
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
    setDateOpen(false);
  };

  const handleApplyCustomDate = () => {
    if (customDateFrom && customDateTo) {
      setFilterClause('date', 'between', { from: customDateFrom, to: customDateTo });
      setDateOpen(false);
    }
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

  const handleApplyAmount = () => {
    const num1 = parseFloat(amountVal1);
    if (isNaN(num1)) return;

    if (amountOp === 'between') {
      const num2 = parseFloat(amountVal2);
      if (isNaN(num2)) return;
      setFilterClause('amount', 'between', { from: Math.min(num1, num2), to: Math.max(num1, num2) });
    } else {
      setFilterClause('amount', amountOp, num1);
    }
    setAmountOpen(false);
  };

  const handleClearAll = () => {
    onFiltersChange([]);
    onSearchChange('');
  };

  // Compute active badge representations
  const activeBadges = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];

    appliedFilters.forEach((f) => {
      if (f.field === 'type') {
        const val = f.value === 'DEBIT' ? 'Expense' : f.value === 'CREDIT' ? 'Income' : String(f.value);
        list.push({ key: 'type', label: `Type: ${val}`, onRemove: () => removeFilter('type') });
      } else if (f.field === 'date') {
        const preset = DATE_PRESETS.find((p) => p.value === f.operator);
        const label = preset
          ? preset.label
          : f.operator === 'between' && f.value
            ? `${(f.value as any).from} - ${(f.value as any).to}`
            : f.operator;
        list.push({ key: 'date', label: `Date: ${label}`, onRemove: () => removeFilter('date') });
      } else if (f.field === 'accountId') {
        const ids = Array.isArray(f.value) ? f.value : [f.value];
        const names = ids
          .map((id) => accounts.find((a) => a.id === id)?.name || id)
          .join(', ');
        list.push({ key: 'accountId', label: `Account: ${names}`, onRemove: () => removeFilter('accountId') });
      } else if (f.field === 'category') {
        const cats = Array.isArray(f.value) ? f.value : [f.value];
        list.push({ key: 'category', label: `Category: ${cats.join(', ')}`, onRemove: () => removeFilter('category') });
      } else if (f.field === 'amount') {
        let label = `Amount ${f.operator} ${f.value}`;
        if (f.operator === 'greater_than') label = `Amount > ₹${f.value}`;
        else if (f.operator === 'less_than') label = `Amount < ₹${f.value}`;
        else if (f.operator === 'between' && f.value) label = `Amount: ₹${(f.value as any).from} - ₹${(f.value as any).to}`;
        list.push({ key: 'amount', label, onRemove: () => removeFilter('amount') });
      } else if (f.field === 'reviewType') {
        const opt = REVIEW_TYPE_OPTIONS.find((r) => r.value === f.value);
        list.push({
          key: 'reviewType',
          label: `Review: ${opt?.label || f.value}`,
          onRemove: () => removeFilter('reviewType'),
        });
      } else if (f.field === 'source') {
        const opt = SOURCE_OPTIONS.find((s) => s.value === f.value);
        list.push({ key: 'source', label: `Source: ${opt?.label || f.value}`, onRemove: () => removeFilter('source') });
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

  const hasActiveFilters = activeBadges.length > 0 || search.trim() !== '';

  return (
    <div className="space-y-1.5 px-4 pt-0.5">
      {/* Top Row: Mobile-first Search Bar */}
      <div className="relative flex items-center w-full">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
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

      {/* Horizontal Scrollable Quick Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* Type Segment Control Pill */}
        <div
          className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full shrink-0">
          <button
            onClick={() => handleTypeChange('ALL')}
            className={cn(
              'px-2.5 py-0.5 text-[11px] font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
              activeType === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
          >
            All
          </button>
          <button
            onClick={() => handleTypeChange('DEBIT')}
            className={cn(
              'px-2.5 py-0.5 text-[11px] font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
              activeType === 'DEBIT'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-700',
            )}
          >
            Expenses
          </button>
          <button
            onClick={() => handleTypeChange('CREDIT')}
            className={cn(
              'px-2.5 py-0.5 text-[11px] font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
              activeType === 'CREDIT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700',
            )}
          >
            Income
          </button>
        </div>

        {/* Date Presets Popover Pill */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3 text-[11px] font-medium gap-1 border shrink-0 transition-all touch-manipulation',
                activeDate.operator !== 'all_time'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
              )}
            >
              <CalendarIcon className="h-3 w-3 opacity-70" />
              <span>{activeDate.label}</span>
              <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2 rounded-2xl shadow-xl">
            <div className="text-xs font-semibold text-slate-500 px-2 py-1">Select Date Window</div>
            <div className="grid grid-cols-2 gap-1 py-1">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDateSelect(preset.value)}
                  className={cn(
                    'text-left px-2.5 py-2 rounded-xl text-xs transition-colors touch-manipulation',
                    activeDate.operator === preset.value
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 px-1 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500">Custom Date Range</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">From</label>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="h-8 text-xs rounded-lg px-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">To</label>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="h-8 text-xs rounded-lg px-2"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
                onClick={handleApplyCustomDate}
                disabled={!customDateFrom || !customDateTo}
              >
                Apply Range
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Account Multi-Select Popover Pill */}
        <Popover open={accountOpen} onOpenChange={setAccountOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3 text-[11px] font-medium gap-1 border shrink-0 transition-all touch-manipulation',
                activeAccountIds.length > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
              )}
            >
              <Wallet className="h-3 w-3 opacity-70" />
              <span>
                {activeAccountIds.length === 0
                  ? 'Account'
                  : activeAccountIds.length === 1
                    ? accounts.find((a) => a.id === activeAccountIds[0])?.name || '1 Account'
                    : `Accounts (${activeAccountIds.length})`}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-xl overflow-hidden">
            <Command>
              <CommandInput placeholder="Search accounts..." className="h-9 text-xs" />
              <CommandList className="max-h-56 p-1">
                <CommandEmpty className="py-4 text-xs text-center text-slate-500">No account found.</CommandEmpty>
                <CommandGroup>
                  {accounts.map((acc) => {
                    const isSelected = activeAccountIds.includes(acc.id);
                    return (
                      <CommandItem
                        key={acc.id}
                        onSelect={() => handleAccountToggle(acc.id)}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} className="pointer-events-none rounded-md" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{acc.name}</span>
                        </div>
                        {acc.type && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.type}</span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Category Multi-Select Popover Pill */}
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3 text-[11px] font-medium gap-1 border shrink-0 transition-all touch-manipulation',
                activeCategories.length > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
              )}
            >
              <Tag className="h-3 w-3 opacity-70" />
              <span>
                {activeCategories.length === 0
                  ? 'Category'
                  : activeCategories.length === 1
                    ? activeCategories[0]
                    : `Categories (${activeCategories.length})`}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-xl overflow-hidden">
            <Command>
              <CommandInput placeholder="Search categories..." className="h-9 text-xs" />
              <CommandList className="max-h-56 p-1">
                <CommandEmpty className="py-4 text-xs text-center text-slate-500">No category found.</CommandEmpty>
                <CommandGroup>
                  {categories.map((cat) => {
                    const isSelected = activeCategories.includes(cat.name);
                    return (
                      <CommandItem
                        key={cat.id}
                        onSelect={() => handleCategoryToggle(cat.name)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none rounded-md" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Surfaced Under Monitoring Quick Filter Pill */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMonitoring}
          className={cn(
            'h-8 rounded-full px-3 text-[11px] font-medium gap-1.5 border shrink-0 transition-all touch-manipulation',
            isMonitoringActive
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold'
              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
          )}
        >
          <Eye className="h-3 w-3 opacity-70" />
          <span>Monitoring</span>
        </Button>

        {/* Amount Range Filter Pill */}
        <Popover open={amountOpen} onOpenChange={setAmountOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 rounded-full px-3 text-[11px] font-medium gap-1 border shrink-0 transition-all touch-manipulation',
                getFilter('amount')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
              )}
            >
              <span>Amount</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 rounded-2xl shadow-xl space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filter by Amount</div>
            <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                type="button"
                onClick={() => setAmountOp('greater_than')}
                className={cn(
                  'flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                  amountOp === 'greater_than' ? 'bg-white dark:bg-slate-800 shadow-xs' : 'text-slate-500',
                )}
              >
                Greater Than
              </button>
              <button
                type="button"
                onClick={() => setAmountOp('less_than')}
                className={cn(
                  'flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                  amountOp === 'less_than' ? 'bg-white dark:bg-slate-800 shadow-xs' : 'text-slate-500',
                )}
              >
                Less Than
              </button>
              <button
                type="button"
                onClick={() => setAmountOp('between')}
                className={cn(
                  'flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                  amountOp === 'between' ? 'bg-white dark:bg-slate-800 shadow-xs' : 'text-slate-500',
                )}
              >
                Between
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  {amountOp === 'between' ? 'Min Amount (₹)' : 'Amount (₹)'}
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1000"
                  value={amountVal1}
                  onChange={(e) => setAmountVal1(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              {amountOp === 'between' && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Max Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={amountVal2}
                    onChange={(e) => setAmountVal2(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              )}

              <Button
                size="sm"
                className="w-full h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
                onClick={handleApplyAmount}
                disabled={!amountVal1}
              >
                Apply Amount Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* More Filters Dropdown (+ Filter) */}
        <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-3 text-[11px] font-medium gap-1 bg-white dark:bg-slate-950 border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0 touch-manipulation"
            >
              <Plus className="h-3 w-3" />
              <span>More</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1 rounded-2xl shadow-xl">
            <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5">Additional Filters</div>

            {/* Review Status */}
            <div className="px-2 py-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block px-1 mb-1">Review Status</span>
              {REVIEW_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilterClause('reviewType', 'is', opt.value);
                    setMoreFiltersOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            {/* Source */}
            <div className="px-2 py-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block px-1 mb-1">Import Source</span>
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilterClause('source', 'is', opt.value);
                    setMoreFiltersOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            {/* Excluded toggle */}
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => {
                  setFilterClause('isExcluded', 'is', true);
                  setMoreFiltersOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Excluded Transactions Only
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Badge Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-0">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            Active:
          </span>

          {search.trim() !== '' && (
            <Badge
              variant="secondary"
              onClick={() => onSearchChange('')}
              className="h-6 gap-1 px-2.5 text-[10px] font-medium rounded-full bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors touch-manipulation"
            >
              <span>Search: &quot;{search}&quot;</span>
              <X className="h-3 w-3 opacity-60" />
            </Badge>
          )}

          {activeBadges.map((badge) => (
            <Badge
              key={badge.key}
              variant="secondary"
              onClick={badge.onRemove}
              className="h-6 gap-1 px-2.5 text-[10px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-colors touch-manipulation"
            >
              <span>{badge.label}</span>
              <X className="h-3 w-3 opacity-60" />
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-[10px] font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full ml-auto touch-manipulation"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
