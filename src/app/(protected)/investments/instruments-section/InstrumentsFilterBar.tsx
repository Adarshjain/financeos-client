'use client';

import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InstrumentSortDir } from '@/lib/instrumentList';
import { cn } from '@/lib/utils';

import { CreateInstrumentDialog } from '../CreateInstrumentDialog';

interface InstrumentsFilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  sortDir: InstrumentSortDir;
  toggleSort: () => void;
  isMobile?: boolean;
}

export function InstrumentsFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortDir,
  toggleSort,
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
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
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
          </SelectContent>
        </Select>

        {/* Name order, sorted on the server */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSort}
          title="Sort by name"
        >
          {sortDir === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          )}
          <span>{sortDir === 'asc' ? 'Name A–Z' : 'Name Z–A'}</span>
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
    </div>
  );
}
