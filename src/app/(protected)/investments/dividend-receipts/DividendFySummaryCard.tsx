import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';

interface DividendFySummaryCardProps {
  gross: number | string | undefined;
  tds: number | string | undefined;
  net: number | string | undefined;
  count: number;
}

export function DividendFySummaryCard({ gross, tds, net, count }: DividendFySummaryCardProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-2.5 sm:p-3">
      <CardContent className="p-0 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <div>
          <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Gross Income</p>
          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {formatMoney(gross || 0)}
          </p>
        </div>

        <div>
          <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">TDS Deducted</p>
          <p className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
            {formatMoney(tds || 0)}
          </p>
        </div>

        <div>
          <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Net Received</p>
          <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(net || 0)}
          </p>
        </div>

        <div>
          <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Payout Events</p>
          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {count}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
