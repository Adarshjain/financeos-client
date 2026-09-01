import { Calendar } from 'lucide-react';

import { GenericAccount } from '@/lib/account.types';
import { formatDate, formatMoney } from '@/lib/utils';

import { AccountMetadataBadges } from './AccountMetadataBadges';
import { AccountWrapper } from './AccountWrapper';

export function GenericAccountTile({ account }: { account: GenericAccount }) {
  return (
    <AccountWrapper account={account} key={account.id}>
      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {account.name}
            </div>
            {account.description ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                {account.description}
              </div>
            ) : null}
          </div>
        </div>

        {/* Metadata Badges */}
        <AccountMetadataBadges account={account} />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(account.balance ?? 0)}
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
