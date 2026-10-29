import { type ObligationItem, obligationWindows, sumAmounts } from '@/features/upcoming/obligationsModel';
import { formatMoney } from '@/lib/utils';

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex-1 min-w-[120px]">
      <div className="text-2xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={`text-sm font-black tabular-nums ${danger && value > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}`}
      >
        {formatMoney(value)}
      </div>
    </div>
  );
}

/** Due next 7 days / this month / overdue; only rows that carry an amount count. */
export function TotalsStrip({ items, today }: { items: ObligationItem[]; today: string }) {
  const w = obligationWindows(items, today);
  return (
    <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-3.5">
      <Stat label="Due next 7 days" value={sumAmounts(w.next7)} />
      <Stat label="This month" value={sumAmounts(w.thisMonth)} />
      <Stat label="Overdue" value={sumAmounts(w.overdue)} danger />
    </div>
  );
}
