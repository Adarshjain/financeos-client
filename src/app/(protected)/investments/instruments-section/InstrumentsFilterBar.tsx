'use client';

import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INSTRUMENT_PAGE_SIZES } from '@/lib/instrumentList';
import { cn } from '@/lib/utils';

import { CreateInstrumentDialog } from '../CreateInstrumentDialog';

interface InstrumentsFilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  currentPage: number;
  pageSize: number;
  hasPrev: boolean;
  hasNext: boolean;
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
  currentPage,
  pageSize,
  hasPrev,
  hasNext,
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
          </SelectContent>
        </Select>

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
        hasPrev={hasPrev}
        hasNext={hasNext}
        loading={loading}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />
    </div>
  );
}

/**
 * Prev/next over the server pages. GET /instruments returns no total, so there is no page count:
 * Next is offered while the current page came back full.
 */
function InstrumentsPager({
  currentPage,
  pageSize,
  hasPrev,
  hasNext,
  loading,
  onPageChange,
  onSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  hasPrev: boolean;
  hasNext: boolean;
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
      {(hasPrev || hasNext) && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!hasPrev || loading}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Button>
          <span className="tabular-nums text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
            Page {currentPage + 1}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!hasNext || loading}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      )}
    </div>
  );
}
