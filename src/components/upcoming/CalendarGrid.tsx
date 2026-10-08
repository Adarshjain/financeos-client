'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { type RowActions } from '@/components/obligations/ObligationGroups';
import { ObligationRow } from '@/components/obligations/ObligationRow';
import type { ObligationItem } from '@/components/obligations/types';
import { Button } from '@/components/ui/button';
import { cn, formatDate, toCalendarDate } from '@/lib/utils';

const DOT: Record<string, string> = {
  card_bill: 'bg-blue-500',
  emi: 'bg-amber-500',
  lending_due: 'bg-emerald-500',
  statement_expected: 'bg-slate-400',
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarGrid({
  items,
  today,
  ...actions
}: { items: ObligationItem[]; today: string } & RowActions) {
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState<string | null>(today);

  const byDay = new Map<string, ObligationItem[]>();
  for (const i of items) {
    if (i.date) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  }
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, d) => toCalendarDate(new Date(cursor.y, cursor.m, d + 1))),
  ];
  const step = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const dayItems = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs font-bold">
            {first.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-2xs font-bold text-slate-400 uppercase">{w}</div>
          ))}
          {cells.map((date, idx) => {
            if (!date) return <div key={`b${idx}`} />;
            const list = byDay.get(date) ?? [];
            const kinds = [...new Set(list.map((i) => i.type))];
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                className={cn(
                  'h-11 rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 border transition-colors',
                  selected === date
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40',
                  date === today && 'font-black text-emerald-700 dark:text-emerald-400'
                )}
              >
                <span className="tabular-nums">{Number(date.slice(8))}</span>
                <span className="flex gap-0.5 h-1.5">
                  {kinds.map((k) => (
                    <span key={k} className={cn('h-1.5 w-1.5 rounded-full', DOT[k] ?? 'bg-slate-400')} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
            {formatDate(selected)}
          </div>
          {dayItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">Nothing due on this day.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayItems.map((item, idx) => (
                <ObligationRow
                  key={idx}
                  item={item}
                  highlighted={Boolean(actions.highlightStatementId) && item.statementId === actions.highlightStatementId}
                  onMarkPaid={actions.onMarkPaid}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
