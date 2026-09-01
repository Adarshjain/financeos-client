'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  Search,
  X,
} from 'lucide-react';

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
import { cn } from '@/lib/utils';

import { CreateInstrumentDialog } from '../CreateInstrumentDialog';

export type SortOrder = 'none' | 'asc' | 'desc';

interface InstrumentsFilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  sortOrder: SortOrder;
  toggleSort: () => void;
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
  isMobile?: boolean;
}

export function InstrumentsFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortOrder,
  toggleSort,
  currentPage,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  isMobile = false,
}: InstrumentsFilterBarProps) {
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
          placeholder="Search by ticker, name, ISIN..."
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
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="h-8 text-xs w-[125px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
            <SelectItem value="etf">ETF</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Button */}
        <Button
          variant={sortOrder === 'none' ? 'outline' : 'secondary'}
          size="sm"
          onClick={toggleSort}
          title="Sort by Name"
        >
          {sortOrder === 'asc' && (
            <>
              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mr-1" />
              <span>Name A-Z</span>
            </>
          )}
          {sortOrder === 'desc' && (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mr-1" />
              <span>Name Z-A</span>
            </>
          )}
          {sortOrder === 'none' && (
            <>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <span>Sort</span>
            </>
          )}
        </Button>

        {/* Add Instrument Dialog Trigger */}
        <CreateInstrumentDialog
          trigger={
            <Button size="sm" variant="blue" className="shrink-0">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Instrument</span>
            </Button>
          }
        />
      </div>
      <TablePagination
        page={{
          number: currentPage,
          size: pageSize,
          totalElements,
          totalPages,
        }}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
        unit="instrument"
        className="flex flex-row"
      />
    </div>
  );
}
