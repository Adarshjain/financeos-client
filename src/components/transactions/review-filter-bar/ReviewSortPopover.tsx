'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { SORT_OPTIONS } from './constants';

interface ReviewSortPopoverProps {
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

export function ReviewSortPopover({
  sortBy,
  onSortByChange,
}: ReviewSortPopoverProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const activeSortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort';

  return (
    <Popover open={sortOpen} onOpenChange={setSortOpen}>
      <PopoverTrigger asChild>
        <Button variant="filter" size="pill" className="gap-1">
          <span>{activeSortLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1 rounded-2xl shadow-xl">
        <div className="text-xs font-semibold text-slate-400 px-3 py-1">Sort Order</div>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onSortByChange(opt.value);
              setSortOpen(false);
            }}
            className={cn(
              'w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors flex items-center justify-between',
              sortBy === opt.value
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span>{opt.label}</span>
            {sortBy === opt.value && (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
