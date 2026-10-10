'use client';

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INSTRUMENT_PAGE_SIZES, type InstrumentSortDir } from '@/lib/instrumentList';
import { cn } from '@/lib/utils';

import { CreateInstrumentDialog } from '../CreateInstrumentDialog';

interface InstrumentsFilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  sortDir: InstrumentSortDir;
  toggleSort: () => void;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
  isMobile?: boolean;
}

export function InstrumentsFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortDir,
  toggleSort,
  currentPage,
  pageSize,
  totalPages,
  loading = false,
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
      <InstrumentsPager
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        loading={loading}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />
    </div>
  );
}

/** Page size plus prev/next over the server pages, with the page count from GET /instruments. */
function InstrumentsPager({
  currentPage,
  pageSize,
  totalPages,
  loading,
  onPageChange,
  onSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Select value={String(pageSize)} onValueChange={(val) => onSizeChange(Number(val))} disabled={loading}>
        <SelectTrigger
          aria-label="Instruments per page"
          className="w-[110px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none h-8"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          {INSTRUMENT_PAGE_SIZES.map((s) => (
            <SelectItem key={s} value={String(s)} className="text-xs">
              {s} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Also shown on a page past the end (rows deleted meanwhile), so the user can step back. */}
      {(totalPages > 1 || currentPage > 0) && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={currentPage <= 0 || loading}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Button>
          <span className="tabular-nums text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
            {currentPage + 1} / {Math.max(totalPages, currentPage + 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={currentPage >= totalPages - 1 || loading}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      )}
    </div>
  );
}
