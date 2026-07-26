import {cn, formatMoney} from '@/lib/utils';

interface TransactionAmountProps {
  amount: number;
  /** Running balance after the transaction; omitted when there is none to show. */
  balance?: number | null;
  children: React.ReactNode;
}

export function TransactionAmount({amount, balance, children}: TransactionAmountProps) {
  const isCredit = amount >= 0;

  return (
      <div className="flex flex-col items-end shrink-0 pl-2">
        <div
            className={cn(
                'font-black text-base whitespace-nowrap tabular-nums tracking-tight',
                isCredit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500',
            )}
        >
          {isCredit ? '+' : '-'} {formatMoney(Math.abs(amount))}
        </div>
        {balance !== null && balance !== undefined && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
              Bal: {formatMoney(balance)}
            </div>
        )}
        {children}
      </div>
  );
}
