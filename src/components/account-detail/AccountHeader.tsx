import { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { type Account, isAccountClosed } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { formatMoney, formatNullableMoney } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  [AccountType.BANK_ACCOUNT]: 'Bank account',
  [AccountType.CREDIT_CARD]: 'Credit card',
  [AccountType.BROKER]: 'Broker',
  [AccountType.GENERIC]: 'Wallet / Cash',
};

export function AccountHeader({ account, actions }: { account: Account; actions: ReactNode }) {
  const closed = isAccountClosed(account);
  const last4 = 'last4' in account ? account.last4 : undefined;
  const sub = [TYPE_LABEL[account.type] ?? account.type, last4 ? `•••• ${last4}` : null]
    .filter(Boolean)
    .join(' · ');

  let balanceLabel = 'Balance';
  let balance = formatNullableMoney(account.balance);
  if (account.type === AccountType.CREDIT_CARD) balanceLabel = 'Outstanding';
  if (account.type === AccountType.BROKER) {
    balanceLabel = 'Portfolio value';
    balance = formatMoney(account.balance ?? 0);
  }

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white break-words">
              {account.name}
            </h1>
            {closed ? <Badge variant="secondary">Closed</Badge> : null}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xs font-medium text-slate-400">{balanceLabel}</div>
          <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{balance}</div>
        </div>
      </div>
      {actions}
    </div>
  );
}
