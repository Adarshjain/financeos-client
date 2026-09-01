import { Calendar } from 'lucide-react';

import { CreditCard } from '@/lib/account.types';
import { cn, formatDate, formatMoney, formatNullableMoney } from '@/lib/utils';

import { AccountMetadataBadges } from './AccountMetadataBadges';
import { AccountWrapper } from './AccountWrapper';

export function CreditCardTile({ account }: { account: CreditCard }) {
  return (
    <AccountWrapper account={account} key={account.id}>
      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {account.name}
            </div>
            {account.description ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                {account.description}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {account.cardholders && account.cardholders.length > 1 ? (
              <span className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                {account.cardholders.length} cardholders
              </span>
            ) : null}
            {account.last4 ? (
              <span className="text-2xs tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                •••• {account.last4}
              </span>
            ) : (
              <span className="text-2xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                No active card
              </span>
            )}
          </div>
        </div>

        {/* Metadata Badges */}
        <AccountMetadataBadges account={account} />

        {/* Stats & Credit Limits */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
              {account.balanceAnchored && account.anchorDate ? (
                <span className="text-2xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                  Anchored as of {formatDate(account.anchorDate)}
                </span>
              ) : null}
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatNullableMoney(account.balance)}
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Credit Limit</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(account.creditLimit)}
            </span>
          </div>

          {(() => {
            const balance = account.balance ?? 0;
            const limit = account.creditLimit || 0;
            const utilization = limit > 0 ? (Math.abs(balance) / limit) * 100 : 0;
            return (
              <div className="space-y-1">
                <div className="flex justify-between text-2xs">
                  <span className="text-slate-400 dark:text-slate-500">Utilization</span>
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      utilization > 50 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      utilization > 70 ? 'bg-rose-500' : utilization > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {account.ingestFromDate ? (
          <div className="text-2xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-600" />
            <span>Gmail Sync Watermark: {formatDate(account.ingestFromDate)}</span>
          </div>
        ) : null}
      </div>
    </AccountWrapper>
  );
}
