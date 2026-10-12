'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { REASON_OPTIONS } from './constants';

interface ReviewReasonPopoverProps {
  activeReasonFilter: string;
  onReasonFilterChange: (reason: string) => void;
}

export function ReviewReasonPopover({
  activeReasonFilter,
  onReasonFilterChange,
}: ReviewReasonPopoverProps) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const active = REASON_OPTIONS.find((r) => r.value === activeReasonFilter) ?? REASON_OPTIONS[0];
  const isFiltered = active.value !== 'ALL';

  return (
    <Popover open={reasonOpen} onOpenChange={setReasonOpen}>
      <PopoverTrigger asChild>
        <Button variant={isFiltered ? 'filter-active' : 'filter'} size="pill" className="gap-1">
          <span>{active.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1 rounded-2xl shadow-xl">
        <div className="text-xs font-semibold text-slate-400 px-3 py-1">Review Reason</div>
        {REASON_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onReasonFilterChange(opt.value);
              setReasonOpen(false);
            }}
            className={cn(
              'w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors flex items-center justify-between',
              active.value === opt.value
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span>{opt.label}</span>
            {active.value === opt.value && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
