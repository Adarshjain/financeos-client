import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

/** A titled, collapsible list inside a job result. Renders nothing when there are no items. */
export function ResultSection({
  title,
  count,
  defaultOpen = false,
  tone = 'neutral',
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  tone?: 'neutral' | 'danger';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 font-semibold hover:underline focus:outline-none ${
          tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>
          {title} ({count})
        </span>
      </button>
      {open && (
        <ul className="ml-4 space-y-0.5 text-slate-700 dark:text-slate-300 max-h-60 overflow-y-auto pr-1">{children}</ul>
      )}
    </div>
  );
}

export const RESULT_CARD =
  'p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-2xs space-y-1.5';
