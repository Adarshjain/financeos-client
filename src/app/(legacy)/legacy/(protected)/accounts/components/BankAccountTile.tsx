import { Calendar } from 'lucide-react';

import { BankAccount } from '@/lib/account.types';
import { formatDate, formatMoney } from '@/lib/utils';

import { AccountMetadataBadges } from './AccountMetadataBadges';
import { AccountWrapper } from './AccountWrapper';

export function BankAccountTile({ account }: { account: BankAccount }) {
  return (
    <AccountWrapper account={account} key={account.id}>
      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {account.name}
            </div>
            {account.description ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                {account.description}
              </div>
            ) : null}
          </div>

          {account.last4 ? (
            <span className="text-2xs tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
              •••• {account.last4}
            </span>
          ) : null}
        </div>

        {/* Metadata Badges */}
        <AccountMetadataBadges account={account} />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
              {account.balanceAnchored && account.anchorDate ? (
                <span className="text-2xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                  Anchored as of {formatDate(account.anchorDate)}
                </span>
              ) : null}
              {account.reconciliationGap !== null && account.reconciliationGap !== undefined ? (
                <span
                  title={`Calculated from opening balance: ${formatMoney(account.openingBalance ?? 0)}. Gap from anchored statement: ${formatMoney(account.reconciliationGap)}. Check statement history.`}
                  className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded cursor-help flex items-center gap-1"
                >
                  ⚠️ Gap: {formatMoney(account.reconciliationGap)}
                </span>
              ) : null}
            </div>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(account.balance ?? account.openingBalance)}
            </span>
          </div>
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
