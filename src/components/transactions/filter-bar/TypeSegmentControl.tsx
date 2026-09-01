'use client';

import { cn } from '@/lib/utils';

interface TypeSegmentControlProps {
  activeType: string;
  onTypeChange: (type: 'ALL' | 'DEBIT' | 'CREDIT') => void;
}

export function TypeSegmentControl({
  activeType,
  onTypeChange,
}: TypeSegmentControlProps) {
  return (
    <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full shrink-0">
      <button
        onClick={() => onTypeChange('ALL')}
        className={cn(
          'px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
          activeType === 'ALL'
            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        )}
      >
        All
      </button>
      <button
        onClick={() => onTypeChange('DEBIT')}
        className={cn(
          'px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
          activeType === 'DEBIT'
            ? 'bg-rose-500 text-white shadow-xs'
            : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
        )}
      >
        Expenses
      </button>
      <button
        onClick={() => onTypeChange('CREDIT')}
        className={cn(
          'px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all touch-manipulation min-h-[28px]',
          activeType === 'CREDIT'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
        )}
      >
        Income
      </button>
    </div>
  );
}
