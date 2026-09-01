'use client';

import { CounterpartyResponse } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface CounterpartyHeroHeaderProps {
  cp: CounterpartyResponse;
}

export function CounterpartyHeroHeader({ cp }: CounterpartyHeroHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
          {cp.name}
          <span
            className={`text-sm sm:text-base font-extrabold px-2.5 py-0.5 rounded-md ${
              cp.netPosition > 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : cp.netPosition < 0
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {cp.netPosition > 0 ? '+' : ''}
            {formatMoney(cp.netPosition)}
          </span>
        </h1>
        {cp.notes && <p className="text-xs text-slate-500 mt-1">{cp.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-2xs text-slate-500 font-semibold uppercase">
            Total Lent
          </div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(cp.totalLent)}
          </div>
        </div>
        <div>
          <div className="text-2xs text-slate-500 font-semibold uppercase">
            Total Borrowed
          </div>
          <div className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatMoney(cp.totalBorrowed)}
          </div>
        </div>
      </div>
    </div>
  );
}
