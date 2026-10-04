'use client';

import { Search, X } from 'lucide-react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/lib/categories.types';
import type { MatchType } from '@/lib/rules.types';
import { cn } from '@/lib/utils';

import { DEFAULT_RULE_FILTERS, RULE_SORT_OPTIONS, type RuleFilters } from './constants';
import { MATCH_TYPE_META } from './RuleCard';

const SELECT_TRIGGER_CLASS =
  'h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold';
const SELECT_CONTENT_CLASS =
  'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs';

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={SELECT_TRIGGER_CLASS}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={SELECT_CONTENT_CLASS}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs font-medium">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Any source' },
  { value: 'LLM', label: 'LLM-generated' },
  { value: 'USER', label: 'Created by you' },
];

const MATCH_TYPE_OPTIONS = [
  { value: 'all', label: 'Any match type' },
  ...(Object.keys(MATCH_TYPE_META) as MatchType[]).map((t) => ({
    value: t,
    label: MATCH_TYPE_META[t].label,
  })),
];

const APPLIED_OPTIONS = [
  { value: 'all', label: 'Any usage' },
  { value: 'true', label: 'Used at least once' },
  { value: 'false', label: 'Never used' },
];

interface RulesFilterBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  filters: RuleFilters;
  onFilterChange: <K extends keyof RuleFilters>(key: K, value: RuleFilters[K]) => void;
  onClearFilters: () => void;
  categories: Category[];
  searchVal: string;
  setSearchVal: (s: string) => void;
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isPending: boolean;
  onPageChange: (newPage: number) => void;
  onSizeChange: (newSize: number) => void;
}

export function RulesFilterBar({
  activeTab,
  onTabChange,
  filters,
  onFilterChange,
  onClearFilters,
  categories,
  searchVal,
  setSearchVal,
  pageNumber,
  pageSize,
  totalElements,
  totalPages,
  isPending,
  onPageChange,
  onSizeChange,
}: RulesFilterBarProps) {
  const categoryOptions = [
    { value: 'all', label: 'Any category' },
    ...[...categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.id, label: c.name })),
  ];
  const hasActiveFilters = (Object.keys(DEFAULT_RULE_FILTERS) as (keyof RuleFilters)[]).some(
    (k) => filters[k] !== DEFAULT_RULE_FILTERS[k]
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Toggle Chips/Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        {[
          { id: 'false', label: 'Unverified' },
          { id: 'true', label: 'Verified' },
          { id: 'all', label: 'All' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Box */}
      <div className="relative min-w-[240px] flex-1 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search merchant keys or display names..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-all"
        />
      </div>

      {/* Attribute filters + sort */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
        <FilterSelect
          label="Source"
          value={filters.source}
          onChange={(v) => onFilterChange('source', v as RuleFilters['source'])}
          options={SOURCE_OPTIONS}
        />
        <FilterSelect
          label="Match type"
          value={filters.matchType}
          onChange={(v) => onFilterChange('matchType', v as RuleFilters['matchType'])}
          options={MATCH_TYPE_OPTIONS}
        />
        <FilterSelect
          label="Category"
          value={filters.categoryId}
          onChange={(v) => onFilterChange('categoryId', v)}
          options={categoryOptions}
        />
        <FilterSelect
          label="Usage"
          value={filters.applied}
          onChange={(v) => onFilterChange('applied', v as RuleFilters['applied'])}
          options={APPLIED_OPTIONS}
        />
        <FilterSelect
          label="Sort"
          value={filters.sort}
          onChange={(v) => onFilterChange('sort', v)}
          options={RULE_SORT_OPTIONS}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="h-8 text-xs"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      </div>

      <TablePagination
        page={{
          number: pageNumber,
          size: pageSize,
          totalElements,
          totalPages,
        }}
        loading={isPending}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
        unit="rule"
        className="w-full px-1"
      />
    </div>
  );
}
