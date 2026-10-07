import { Card, CardContent } from '@/components/ui/card';
import type { DividendReceiptStatus, DividendReceiptSummary } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

function bucketOf(summary: DividendReceiptSummary, status: DividendReceiptStatus) {
  return summary.buckets.find((b) => b.status === status);
}

interface TileProps {
  label: string;
  count: number;
  amount?: number;
  tone: string;
  note?: string;
}

function Tile({ label, count, amount, tone, note }: TileProps) {
  return (
    <div>
      <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('text-xs sm:text-sm font-black tabular-nums', tone)}>
        {count}
        {amount !== undefined && <span className="font-semibold"> · {formatMoney(amount)}</span>}
      </p>
      {note && <p className="text-2xs text-slate-500 dark:text-slate-400">{note}</p>}
    </div>
  );
}

export function ReceiptSummaryCard({ summary }: { summary: DividendReceiptSummary }) {
  const received = bucketOf(summary, 'received');
  const untracked = bucketOf(summary, 'received_untracked');
  const notReceived = bucketOf(summary, 'not_received');
  const untrackedCount = untracked?.count ?? 0;
  const notReceivedCount = notReceived?.count ?? 0;
  const awaiting = bucketOf(summary, 'awaiting');
  const overdue = bucketOf(summary, 'overdue');
  const unverifiable = bucketOf(summary, 'unverifiable');

  return (
    <Card
      data-testid="receipt-summary"
      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-2.5 sm:p-3"
    >
      <CardContent className="p-0 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <Tile
            label="Received"
            count={(received?.count ?? 0) + untrackedCount}
            amount={(received?.receivedAmount ?? 0) + (untracked?.receivedAmount ?? 0)}
            note={untrackedCount > 0 ? `incl. ${untrackedCount} untracked` : undefined}
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <Tile
            label="Awaiting"
            count={awaiting?.count ?? 0}
            amount={awaiting?.expectedNet ?? 0}
            tone="text-sky-600 dark:text-sky-400"
          />
          <Tile
            label="Overdue"
            count={overdue?.count ?? 0}
            amount={overdue?.expectedNet ?? 0}
            note={notReceivedCount > 0 ? `${notReceivedCount} marked not received` : undefined}
            tone="text-amber-600 dark:text-amber-400"
          />
          <Tile
            label="No bank data"
            count={unverifiable?.count ?? 0}
            tone="text-slate-700 dark:text-slate-300"
          />
        </div>
        <p className="text-2xs text-slate-500 dark:text-slate-400">
          {summary.coverageEnd
            ? `Bank data through ${formatDate(summary.coverageEnd)}`
            : 'No bank transactions imported yet'}
        </p>
      </CardContent>
    </Card>
  );
}
