'use client';

import { cn } from '@/lib/utils';

import { REASON_OPTIONS } from './constants';

interface ReviewReasonSegmentControlProps {
  activeReasonFilter: string;
  onReasonFilterChange: (reason: string) => void;
}

export function ReviewReasonSegmentControl({
  activeReasonFilter,
  onReasonFilterChange,
}: ReviewReasonSegmentControlProps) {
  return (
    <div className="inline-flex flex-wrap items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full">
      {REASON_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onReasonFilterChange(opt.value)}
          className={cn(
            'px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
            activeReasonFilter === opt.value
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          {opt.value === 'ALL' ? 'All' : opt.shortLabel}
        </button>
      ))}
    </div>
  );
}
