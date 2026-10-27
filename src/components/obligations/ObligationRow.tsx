import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  FileText,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { legacyHref } from '@/features/shell/routes';
import {
  daysText,
  obligationHref,
  type ObligationItem,
  obligationTitle,
} from '@/features/upcoming/obligations';
import { cn, formatDate, formatMoney } from '@/lib/utils';



const TYPE_LABEL: Record<string, string> = {
  emi: 'Loan EMI',
  lending_due: 'Lending',
  card_bill: 'Card bill',
  statement_expected: 'Statement',
};

function RowIcon({ item }: { item: ObligationItem }) {
  const cls = 'h-4 w-4';
  if (item.type === 'emi') return <Wallet className={cls} />;
  if (item.type === 'card_bill') return <CreditCard className={cls} />;
  if (item.type === 'statement_expected') return <FileText className={cls} />;
  return item.direction === 'lent' ? (
    <ArrowUpRight className={cn(cls, 'text-emerald-600')} />
  ) : (
    <ArrowDownLeft className={cn(cls, 'text-rose-600')} />
  );
}

interface ObligationRowProps {
  item: ObligationItem;
  highlighted?: boolean;
  onMarkPaid?: (statementId: string) => void;
}

export function ObligationRow({ item, highlighted, onMarkPaid }: ObligationRowProps) {
  const overdue = item.status === 'overdue';
  const dueSoon = item.status === 'due_soon';
  const href = obligationHref(item);
  const canMarkPaid = item.type === 'card_bill' && Boolean(item.statementId) && onMarkPaid;
  const uploadHref =
    item.type === 'statement_expected' && item.accountId
      ? legacyHref(`/transactions/import?account=${item.accountId}`)
      : null;

  return (
    <div
      data-bill-row={item.type === 'card_bill' ? (item.statementId ?? undefined) : undefined}
      className={cn(
        'p-3.5 flex items-center justify-between gap-3 transition-colors text-xs',
        overdue ? 'hover:bg-rose-100/40' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30',
        highlighted && 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-inset ring-emerald-300'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'p-2 rounded-lg shrink-0',
            overdue
              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          )}
        >
          <RowIcon item={item} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {obligationTitle(item)}
          </div>
          <div className="text-slate-500 text-xs">
            <span
              className={cn(
                overdue
                  ? 'font-semibold text-rose-600'
                  : 'font-medium text-slate-800 dark:text-slate-200'
              )}
            >
              {item.date ? formatDate(item.date) : 'Due date unknown'}
            </span>
            {item.daysUntil != null && <span> · {daysText(item.daysUntil)}</span>}
            {item.accountName && <span> · {item.accountName}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <div
            className={cn(
              'font-bold tabular-nums',
              overdue ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'
            )}
          >
            {item.amount == null ? '—' : formatMoney(item.amount)}
          </div>
          {overdue ? (
            <Badge variant="destructive" size="sm">Overdue</Badge>
          ) : (
            <Badge variant={dueSoon ? 'warning' : 'outline'} size="sm">
              {dueSoon ? 'Due soon' : (TYPE_LABEL[item.type] ?? 'Upcoming')}
            </Badge>
          )}
        </div>
        {canMarkPaid && (
          <Button variant="primary" size="xs" onClick={() => onMarkPaid(item.statementId!)}>
            Mark paid
          </Button>
        )}
        {uploadHref && (
          <Button variant="outline" size="xs" asChild>
            <Link href={uploadHref}>Upload</Link>
          </Button>
        )}
        {href && (
          <Button variant="ghost" size="icon-sm" asChild className="text-slate-400">
            <Link href={legacyHref(href)} aria-label="Open">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
