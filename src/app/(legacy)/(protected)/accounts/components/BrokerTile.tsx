import { Broker } from '@/lib/account.types';
import { formatMoney } from '@/lib/utils';

import { AccountMetadataBadges } from './AccountMetadataBadges';
import { AccountWrapper } from './AccountWrapper';

export function BrokerTile({ account }: { account: Broker }) {
  return (
    <AccountWrapper account={account} key={account.id}>
      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {account.name}
            </div>
            {account.provider ? (
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {account.provider} {account.clientId ? `(${account.clientId})` : ''}
              </div>
            ) : null}
          </div>
        </div>

        <AccountMetadataBadges account={account} />

        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Portfolio Value</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(account.balance ?? 0)}
            </span>
          </div>
          {account.cashBalance !== undefined && (
            <div className="flex justify-between items-baseline text-xs text-slate-500 dark:text-slate-400">
              <span>Cash Balance</span>
              <span className="tabular-nums font-semibold">{formatMoney(account.cashBalance)}</span>
            </div>
          )}
        </div>
      </div>
    </AccountWrapper>
  );
}
