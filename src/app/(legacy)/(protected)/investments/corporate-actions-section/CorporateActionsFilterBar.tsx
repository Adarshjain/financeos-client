'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SortOrder = 'none' | 'asc' | 'desc';

interface CorporateActionsFilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  sortOrder: SortOrder;
  toggleSort: () => void;
  openCreateDialog: () => void;
  isMobile?: boolean;
}

export function CorporateActionsFilterBar({
  search,
  onSearchChange,
  typeFilter,
  setTypeFilter,
  sortOrder,
  toggleSort,
  openCreateDialog,
  isMobile = false,
}: CorporateActionsFilterBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 w-full',
        isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-wrap'
      )}
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px] w-full">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search actions..."
          className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter & Action Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-[120px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="split">Split</SelectItem>
            <SelectItem value="bonus">Bonus</SelectItem>
            <SelectItem value="demerger">Demerger</SelectItem>
            <SelectItem value="merger">Merger</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Button */}
        <Button
          variant={sortOrder === 'none' ? 'outline' : 'secondary'}
          size="sm"
          onClick={toggleSort}
          title="Sort by Ex-Date"
        >
          {sortOrder === 'asc' && (
            <>
              <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 mr-1" />
              <span>Ex-Date</span>
            </>
          )}
          {sortOrder === 'desc' && (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 mr-1" />
              <span>Ex-Date</span>
            </>
          )}
          {sortOrder === 'none' && (
            <>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <span>Sort</span>
            </>
          )}
        </Button>

        {/* Record Action Button */}
        <Button size="sm" variant="purple" onClick={openCreateDialog}>
          <Plus className="w-3.5 h-3.5" />
          <span>Record Action</span>
        </Button>
      </div>
    </div>
  );
}
