import { Badge } from '@/components/ui/badge';
import type { DividendReceiptStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const BASE = 'text-2xs px-1 py-0';

const CONFIG: Record<DividendReceiptStatus, { label: string; className: string; title?: string }> = {
  received: {
    label: 'Received',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  received_untracked: {
    label: 'Received (untracked)',
    className: 'bg-transparent text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
  },
  awaiting: {
    label: 'Awaiting',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    title: 'Payout window still open',
  },
  overdue: {
    label: 'Overdue',
    className:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    title: 'Payout window passed and your bank data covers it',
  },
  not_received: {
    label: 'Not received',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  unverifiable: {
    label: 'No bank data',
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    title: 'Window passed but no tracked bank account has transactions that late',
  },
};

export function ReceiptStatusBadge({ status }: { status?: DividendReceiptStatus | null }) {
  if (!status) return null;
  const cfg = CONFIG[status];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={cn(BASE, cfg.className)} title={cfg.title}>
      {cfg.label}
    </Badge>
  );
}
