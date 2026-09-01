'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterValue } from '@/lib/reports.types';

import { REVIEW_TYPE_OPTIONS, SOURCE_OPTIONS } from './constants';

interface MoreFiltersDropdownProps {
  onSetFilter: (field: string, operator: string | null, value?: FilterValue) => void;
}

export function MoreFiltersDropdown({ onSetFilter }: MoreFiltersDropdownProps) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  return (
    <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="filter"
          size="pill"
          className="gap-1 border-dashed border-slate-300 dark:border-slate-700"
        >
          <Plus className="h-3 w-3" />
          <span>More</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1 rounded-2xl shadow-xl">
        <div className="text-xs font-semibold text-slate-400 px-3 py-1.5">Additional Filters</div>

        {/* Review Status */}
        <div className="px-2 py-1">
          <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block px-1 mb-1">
            Review Status
          </span>
          {REVIEW_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSetFilter('reviewType', 'is', opt.value);
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
          <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block px-1 mb-1">
            Import Source
          </span>
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSetFilter('source', 'is', opt.value);
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
              onSetFilter('isExcluded', 'is', true);
              setMoreFiltersOpen(false);
            }}
            className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Excluded Transactions Only
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
