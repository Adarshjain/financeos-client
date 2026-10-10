// Small presentational pieces shared by the picker's static widget previews.
// Everything here is sample data drawn with plain markup: no data fetching.

import type { ReactNode } from 'react';

import { utilisationBarWidth, utilisationToneClasses } from '@/lib/utilisation';
import { cn } from '@/lib/utils';

export const bigFigure = 'text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white';
export const mutedText = 'text-2xs text-slate-500 dark:text-slate-400';
export const rowText = 'text-xs text-slate-700 dark:text-slate-200';
export const gainText = 'text-emerald-600 dark:text-emerald-400';
export const lossText = 'text-rose-600 dark:text-rose-400';

/** A label on the left, a figure on the right. */
export function PreviewRow({ label, value, valueClass }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn(rowText, 'min-w-0 truncate')}>{label}</span>
      <span className={cn('shrink-0 text-xs font-semibold tabular-nums text-slate-900 dark:text-white', valueClass)}>
        {value}
      </span>
    </div>
  );
}

/** A thin progress bar; `pct` 0–100, coloured by the utilisation scale unless a class is given. */
export function PreviewBar({ pct, barClass }: { pct: number; barClass?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={cn('h-full rounded-full', barClass ?? utilisationToneClasses(pct).bar)}
        style={{ width: utilisationBarWidth(pct) }}
      />
    </div>
  );
}

/** A tiny pill standing in for a row action ("Mark paid", "Settle up"). */
export function PreviewPill({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-2xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
      {children}
    </span>
  );
}

/** A vertical list of preview rows. */
export function PreviewList({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}
