import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

import { formatMoney, parseCalendarDate, toCalendarDate } from '@/lib/utils';

import { ObligationRow } from './ObligationRow';
import type { ObligationItem } from './types';

export interface RowActions {
  highlightStatementId?: string | null;
  onMarkPaid?: (statementId: string) => void;
}

export function sumAmounts(items: ObligationItem[]): number {
  return items.reduce((s, i) => s + (i.amount ?? 0), 0);
}

function addDays(date: string, n: number): string {
  const d = parseCalendarDate(date);
  d.setDate(d.getDate() + n);
  return toCalendarDate(d);
}

export interface ObligationBuckets {
  overdue: ObligationItem[];
  next7: ObligationItem[];
  laterThisMonth: ObligationItem[];
  months: { key: string; label: string; items: ObligationItem[] }[];
  undated: ObligationItem[];
}

/** Splits items into the List view sections; `today` is a YYYY-MM-DD calendar date. */
export function bucketObligations(items: ObligationItem[], today: string): ObligationBuckets {
  const in7 = addDays(today, 7);
  const monthPrefix = today.slice(0, 7);
  const out: ObligationBuckets = { overdue: [], next7: [], laterThisMonth: [], months: [], undated: [] };
  const byMonth = new Map<string, ObligationItem[]>();
  for (const item of items) {
    if (item.status === 'overdue') out.overdue.push(item);
    else if (!item.date) out.undated.push(item);
    else if (item.date <= in7) out.next7.push(item);
    else if (item.date.startsWith(monthPrefix)) out.laterThisMonth.push(item);
    else {
      const k = item.date.slice(0, 7);
      byMonth.set(k, [...(byMonth.get(k) ?? []), item]);
    }
  }
  out.months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      label: parseCalendarDate(`${key}-01`).toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      items: list,
    }));
  return out;
}

function Section({
  title,
  items,
  actions,
  tone = 'neutral',
}: { title: string; items: ObligationItem[]; actions: RowActions; tone?: 'neutral' | 'danger' }) {
  if (items.length === 0) return null;
  const danger = tone === 'danger';
  return (
    <div
      className={
        danger
          ? 'bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl overflow-hidden shadow-sm'
          : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden'
      }
    >
      <div
        className={
          danger
            ? 'p-3.5 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400'
            : 'p-3.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold'
        }
      >
        <span className="flex items-center gap-2">
          {danger && <AlertCircle className="h-4 w-4" />}
          {title} ({items.length})
        </span>
        <span className={danger ? 'tabular-nums' : 'text-slate-500 font-normal tabular-nums'}>
          {formatMoney(sumAmounts(items))}
        </span>
      </div>
      <div className={danger ? 'divide-y divide-rose-100 dark:divide-rose-900/40' : 'divide-y divide-slate-100 dark:divide-slate-800'}>
        {items.map((item, idx) => (
          <ObligationRow
            key={`${item.type}-${item.statementId ?? item.loanId ?? item.counterpartyId ?? item.accountId}-${item.installmentSeq ?? idx}-${idx}`}
            item={item}
            highlighted={Boolean(actions.highlightStatementId) && item.statementId === actions.highlightStatementId}
            onMarkPaid={actions.onMarkPaid}
          />
        ))}
      </div>
    </div>
  );
}

export function ObligationGroups({
  items,
  months,
  today,
  ...actions
}: { items: ObligationItem[]; months: number; today: string } & RowActions) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
        <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Nothing scheduled within the next {months} month{months === 1 ? '' : 's'}.
      </div>
    );
  }
  const b = bucketObligations(items, today);
  return (
    <div className="space-y-3">
      <Section title="Overdue" items={b.overdue} actions={actions} tone="danger" />
      <Section title="Next 7 days" items={b.next7} actions={actions} />
      <Section title="Later this month" items={b.laterThisMonth} actions={actions} />
      {b.months.map((m) => (
        <Section key={m.key} title={m.label} items={m.items} actions={actions} />
      ))}
      <Section title="No due date yet" items={b.undated} actions={actions} />
    </div>
  );
}
